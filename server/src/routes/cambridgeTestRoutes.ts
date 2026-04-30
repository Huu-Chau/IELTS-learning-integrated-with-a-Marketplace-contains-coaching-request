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
        // Storage key pattern: mock-test/cam{book}/{file}
        // e.g. mock-test/cam18/T1S1.mp3
        const storageKey = `mock-test/cam${book}/${file}`;

        // Infer MIME type from file extension
        const ext = file.split('.').pop()?.toLowerCase();
        let mimeType = 'audio/mpeg'; // default for .mp3
        if (ext === 'm4a') mimeType = 'audio/mp4';
        else if (ext === 'ogg') mimeType = 'audio/ogg';
        else if (ext === 'wav') mimeType = 'audio/wav';
        else if (ext === 'webm') mimeType = 'audio/webm';

        console.log('[cambridgeTestRoutes] Streaming audio from MinIO', { storageKey, mimeType });

        const stream = await storageProvider.getFileStream(storageKey);

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        stream.pipe(res);

        stream.on('error', (err) => {
            console.error('[cambridgeTestRoutes] getAudio stream error', err);
            if (!res.headersSent) {
                res.status(404).json({ error: 'Audio file not found' });
            }
        });
    } catch (error) {
        console.error('[cambridgeTestRoutes] getAudio error', error);
        res.status(404).json({ error: 'Audio file not found' });
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
                const rawAnswer = q.answer;

                // ── Case 1: answer is an array of { question_number, answer } objects ──────
                // Used by: multiple_choice_multiple, multiple_choice_multiple_answers
                // These are "Choose TWO" questions where each sub-question has its own correct letter.
                if (Array.isArray(rawAnswer) && rawAnswer.length > 0 && typeof rawAnswer[0] === 'object' && rawAnswer[0] !== null) {
                    // Build a pool of correct answers for any-order matching
                    const correctPool: string[] = rawAnswer.map((a: any) => String(a.answer || '').trim().toLowerCase());

                    for (const entry of rawAnswer as any[]) {
                        const subQNum = String(entry.question_number);
                        const expectedAns = String(entry.answer || '').trim();
                        const userAns = (answers[subQNum] || '').trim();

                        // Check if user answer is anywhere in the pool (order-independent)
                        const userLower = userAns.toLowerCase();
                        const poolCopy = [...correctPool];
                        const matchIdx = poolCopy.indexOf(userLower);
                        const isCorrect = userAns !== '' && matchIdx !== -1;

                        results.push({
                            questionNumber: subQNum,
                            correctAnswer: expectedAns,
                            userAnswer: userAns,
                            isCorrect,
                        });
                    }
                    continue; // handled — skip other cases
                }

                // ── Case 2: string answer, ranged question_number like "5-7" ───────────────
                // Some listening/reading note-completion questions span a range but give
                // answers as a "/" separated string e.g. "answer1/answer2/answer3"
                const correctAnswer = String(rawAnswer ?? '').trim();

                if (qNum.includes('-')) {
                    const [start, end] = qNum.split('-').map(Number);
                    const correctParts = correctAnswer.split('/').map((s: string) => s.trim());

                    for (let i = start; i <= end; i++) {
                        const userAns = (answers[String(i)] || '').trim();
                        const partIndex = i - start;
                        const expectedAns = correctParts[partIndex] || correctAnswer;
                        const acceptableList = expectedAns.split('|').map((s: string) => s.trim().toLowerCase());

                        results.push({
                            questionNumber: String(i),
                            correctAnswer: expectedAns,
                            userAnswer: userAns,
                            isCorrect: userAns !== '' && acceptableList.includes(userAns.toLowerCase()),
                        });
                    }
                    continue;
                }

                // ── Case 3: single question, possibly multiple acceptable answers (/ or |) ─
                const userAns = (answers[qNum] || '').trim();
                // Support "/" as alternative separator (e.g. "gut / intestines")
                const acceptableAnswers = correctAnswer.split(/[/|]/).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
                const isCorrect = userAns !== '' && acceptableAnswers.includes(userAns.toLowerCase());

                results.push({
                    questionNumber: qNum,
                    correctAnswer,
                    userAnswer: userAns,
                    isCorrect,
                });
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