/**
 * cambridgeTestRoutes.ts
 *
 * Serves Cambridge IELTS test data from PostgreSQL (MockMaterials table)
 * and audio recordings from MinIO (via IStorageProvider).
 *
 * Endpoints:
 *   GET  /sets/:skill      — list available test sets (grouped by book)
 *   GET  /:skill/:book     — full test JSON for a given book + skill
 *   GET  /audio/:book/:file — stream audio from MinIO
 *   POST /grade             — compare user answers to correct answers, compute band score
 */
import { Router, Request, Response } from 'express';
import { PostgresMockMaterialStorage } from '../database/PostgresMockMaterialStorage';
import Recording from '../models/Recording';
import { storageProvider } from '../services/storage/StorageService';

const router = Router();
const materialStorage = new PostgresMockMaterialStorage();

// ─── IELTS Band Score Tables ────────────────────────────────────────────────
// Official approximate conversion: raw correct out of 40 → band score
const LISTENING_BAND_TABLE: [number, number][] = [
    [39, 9.0], [37, 8.5], [35, 8.0], [33, 7.5],
    [30, 7.0], [27, 6.5], [23, 6.0], [20, 5.5],
    [16, 5.0], [13, 4.5], [10, 4.0], [6, 3.5],
    [4, 3.0], [2, 2.5], [1, 2.0], [0, 0],
];
const READING_BAND_TABLE: [number, number][] = [
    [39, 9.0], [37, 8.5], [35, 8.0], [33, 7.5],
    [30, 7.0], [27, 6.5], [23, 6.0], [19, 5.5],
    [15, 5.0], [13, 4.5], [10, 4.0], [8, 3.5],
    [6, 3.0], [4, 2.5], [2, 2.0], [0, 0],
];

function rawToBand(raw: number, table: [number, number][]): number {
    console.log('[cambridgeTestRoutes] rawToBand called', { raw });
    for (const [threshold, band] of table) {
        if (raw >= threshold) {
            console.log('[cambridgeTestRoutes] rawToBand result', { raw, band });
            return band;
        }
    }
    return 0;
}

// ─── GET /sets/:skill — List available test sets from PostgreSQL ────────────
router.get('/sets/:skill', async (req: Request, res: Response): Promise<void> => {
    const { skill } = req.params;
    console.log('[cambridgeTestRoutes] getSets called', { skill });

    try {
        const materials = await materialStorage.getAllBySkill(skill);

        // Group by book → { "Cambridge 20": [material1, material2, ...], ... }
        const byBook: Record<string, typeof materials> = {};
        for (const m of materials) {
            if (!byBook[m.book]) byBook[m.book] = [];
            byBook[m.book].push(m);
        }

        // Transform to MockTestSet[] shape the frontend expects
        const sets = Object.entries(byBook)
            .sort(([a], [b]) => {
                const numA = parseInt(a.match(/\d+/)?.[0] ?? '0', 10);
                const numB = parseInt(b.match(/\d+/)?.[0] ?? '0', 10);
                return numB - numA; // newest first (20 → 19 → 18)
            })
            .map(([bookName, mats]) => {
                const bookNum = bookName.match(/\d+/)?.[0] ?? '0';
                return {
                    id: `cambridge-${bookNum}`,
                    name: `Cambridge IELTS ${bookNum}`,
                    tests: mats
                        .sort((a, b) => a.test_number - b.test_number)
                        .map(m => ({ testNumber: m.test_number })),
                };
            });

        console.log('[cambridgeTestRoutes] getSets success', {
            skill,
            setCount: sets.length,
            totalTests: sets.reduce((sum, s) => sum + s.tests.length, 0),
        });
        res.json({ sets });
    } catch (error) {
        console.error('[cambridgeTestRoutes] getSets error', error);
        res.status(500).json({ error: 'Failed to fetch test sets' });
    }
});

// ─── GET /audio/:book/:file — Stream audio from MinIO ───────────────────────
router.get('/audio/:book/:file', async (req: Request, res: Response): Promise<void> => {
    const { book, file } = req.params;
    console.log('[cambridgeTestRoutes] getAudio called', { book, file });

    try {
        const storageKey = `mock-test/cam${book}/${file}`;
        const recording = await Recording.findOne({
            where: { storage_key: storageKey },
        });

        if (recording) {
            console.log('[cambridgeTestRoutes] Streaming audio from MinIO', { storageKey });
            const mimeType = recording.mimetype || 'audio/mp4';
            const stream = await storageProvider.getFileStream(storageKey);

            res.setHeader('Content-Type', mimeType);
            res.setHeader('Accept-Ranges', 'bytes');
            if (recording.size_bytes) {
                res.setHeader('Content-Length', recording.size_bytes);
            }

            stream.pipe(res);
            return;
        }

        console.error('[cambridgeTestRoutes] Audio not found', { storageKey });
        res.status(404).json({ error: 'Audio file not found' });
    } catch (error) {
        console.error('[cambridgeTestRoutes] getAudio error', error);
        res.status(500).json({ error: 'Failed to serve audio file' });
    }
});

// ─── GET /image/:book/:file — Stream image from MinIO ───────────────────────
router.get('/image/:book/:file', async (req: Request, res: Response): Promise<void> => {
    const { book, file } = req.params;
    console.log('[cambridgeTestRoutes] getImage called', { book, file });

    try {
        const storageKey = `mock-test/cam${book}/${file}`;
        console.log('[cambridgeTestRoutes] Streaming image from MinIO', { storageKey });

        // Infer mime type from file extension
        const ext = file.split('.').pop()?.toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === 'png') mimeType = 'image/png';
        if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'svg') mimeType = 'image/svg+xml';

        const stream = await storageProvider.getFileStream(storageKey);

        res.setHeader('Content-Type', mimeType);
        stream.pipe(res);
    } catch (error) {
        console.error('[cambridgeTestRoutes] getImage error', error);
        res.status(404).json({ error: 'Image file not found' });
    }
});

// ─── POST /grade — Compare user answers, compute band score ─────────────────
router.post('/grade', async (req: Request, res: Response): Promise<void> => {
    const { skill, book, testNumber, answers } = req.body as {
        skill: string;
        book: string;
        testNumber: number;
        answers: Record<string, string>; // { "1": "TRUE", "2": "B", ... }
    };
    console.log('[cambridgeTestRoutes] grade called', { skill, book, testNumber, answerCount: Object.keys(answers || {}).length });

    try {
        if (!skill || !book || !testNumber || !answers) {
            res.status(400).json({ error: 'Missing required fields: skill, book, testNumber, answers' });
            return;
        }

        // Fetch the test from PostgreSQL
        const materials = await materialStorage.getByBookAndSkill(book, skill);
        const material = materials.find(m => m.test_number === testNumber);

        if (!material) {
            res.status(404).json({ error: `Test not found: ${book} / ${skill} / Test ${testNumber}` });
            return;
        }

        const testContent = material.content as Record<string, unknown>;

        // Extract all questions with correct answers from the test content
        // Reading uses test.passages[].sub_sections[].questions[]
        // Listening uses test.parts[].sub_sections[].questions[] or test.parts[].questions[]
        interface QuestionAnswer {
            questionNumber: string;
            correctAnswer: string;
            userAnswer: string;
            isCorrect: boolean;
        }

        const results: QuestionAnswer[] = [];
        const sections = (testContent as any).passages || (testContent as any).parts || [];

        for (const section of sections) {
            // Collect questions from sub_sections or direct questions array
            const allQuestions: any[] = [];

            if (section.sub_sections && section.sub_sections.length > 0) {
                for (const sub of section.sub_sections) {
                    if (sub.questions) allQuestions.push(...sub.questions);
                }
            } else if (section.questions && section.questions.length > 0) {
                allQuestions.push(...section.questions);
            }

            for (const q of allQuestions) {
                const qNum = String(q.question_number);
                const correctAnswer = String(q.answer || '').trim();

                // Handle grouped questions like "23-24" => check both "23" and "24"
                if (qNum.includes('-')) {
                    const [start, end] = qNum.split('-').map(Number);
                    // For grouped questions, the correct answer may be multi-part separated by /
                    const correctParts = correctAnswer.split('/').map((s: string) => s.trim());

                    for (let i = start; i <= end; i++) {
                        const userAns = (answers[String(i)] || '').trim();
                        const partIndex = i - start;
                        const expectedAns = correctParts[partIndex] || correctAnswer;

                        results.push({
                            questionNumber: String(i),
                            correctAnswer: expectedAns,
                            userAnswer: userAns,
                            isCorrect: userAns !== '' && userAns.toLowerCase() === expectedAns.toLowerCase(),
                        });
                    }
                } else {
                    const userAns = (answers[qNum] || '').trim();
                    // Handle multiple acceptable answers separated by /
                    const acceptableAnswers = correctAnswer.split('/').map((s: string) => s.trim().toLowerCase());
                    const isCorrect = userAns !== '' && acceptableAnswers.includes(userAns.toLowerCase());

                    results.push({
                        questionNumber: qNum,
                        correctAnswer,
                        userAnswer: userAns,
                        isCorrect,
                    });
                }
            }
        }

        // Sort by question number
        results.sort((a, b) => {
            const numA = parseInt(a.questionNumber, 10);
            const numB = parseInt(b.questionNumber, 10);
            return numA - numB;
        });

        const correct = results.filter(r => r.isCorrect).length;
        const wrong = results.filter(r => !r.isCorrect && r.userAnswer !== '').length;
        const unanswered = results.filter(r => r.userAnswer === '').length;
        const total = results.length;

        const bandTable = skill.toUpperCase() === 'LISTENING' ? LISTENING_BAND_TABLE : READING_BAND_TABLE;
        const bandScore = rawToBand(correct, bandTable);

        console.log('[cambridgeTestRoutes] grade success', { correct, wrong, unanswered, total, bandScore });

        res.json({
            correct,
            wrong,
            unanswered,
            total,
            bandScore,
            results,
        });
    } catch (error) {
        console.error('[cambridgeTestRoutes] grade error', error);
        res.status(500).json({ error: 'Failed to grade test' });
    }
});

// ─── GET /:skill/:book — Full test data from PostgreSQL ─────────────────────
router.get('/:skill/:book', async (req: Request, res: Response): Promise<void> => {
    const { skill, book } = req.params;
    console.log('[cambridgeTestRoutes] getTest called', { skill, book });

    try {
        const materials = await materialStorage.getByBookAndSkill(book, skill);

        if (materials.length > 0) {
            const firstMaterial = materials[0];
            const response = {
                book: firstMaterial.book,
                skill: firstMaterial.skill,
                tests: materials.map(m => m.content),
            };
            console.log('[cambridgeTestRoutes] getTest success', {
                book: firstMaterial.book,
                skill: firstMaterial.skill,
                testCount: materials.length,
            });
            res.json(response);
            return;
        }

        res.status(404).json({ error: `No tests found for ${skill} / book ${book}` });
    } catch (error) {
        console.error('[cambridgeTestRoutes] getTest error', error);
        res.status(500).json({ error: 'Failed to read test data' });
    }
});

export default router;