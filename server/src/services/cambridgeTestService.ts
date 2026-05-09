import { Readable } from 'stream';
import MockMaterial from '../models/MockMaterial';
import { IStorageProvider } from './storage/IStorageProvider';
import { GradeTestPayload } from '../types/cambridge';

export interface ICambridgeTestService {
    getSetsBySkill(skill: string): Promise<any>;
    getFileStream(storageKey: string): Promise<Readable>;
    getTestsByBookAndSkill(book: string, skill: string): Promise<any>;
    gradeTest(payload: GradeTestPayload): Promise<any>;
}

export class CambridgeTestService implements ICambridgeTestService {
    private readonly LISTENING_BAND_TABLE: [number, number][] = [
        [39, 9.0], [37, 8.5], [35, 8.0], [33, 7.5],
        [30, 7.0], [27, 6.5], [23, 6.0], [20, 5.5],
        [16, 5.0], [13, 4.5], [10, 4.0], [6, 3.5],
        [4, 3.0], [2, 2.5], [1, 2.0], [0, 0],
    ];

    private readonly READING_BAND_TABLE: [number, number][] = [
        [39, 9.0], [37, 8.5], [35, 8.0], [33, 7.5],
        [30, 7.0], [27, 6.5], [23, 6.0], [19, 5.5],
        [15, 5.0], [13, 4.5], [10, 4.0], [8, 3.5],
        [6, 3.0], [4, 2.5], [2, 2.0], [0, 0],
    ];

    constructor(private storageProvider: IStorageProvider) { }

    private rawToBand(raw: number, table: [number, number][]): number {
        for (const [threshold, band] of table) {
            if (raw >= threshold) {
                return band;
            }
        }
        return 0;
    }

    async getSetsBySkill(skill: string): Promise<any> {
        console.log('[CambridgeTestService] getSetsBySkill called', { skill });
        const materials = await MockMaterial.findAll({
            where: { skill: skill.toUpperCase() },
            order: [['book', 'ASC'], ['test_number', 'ASC']],
        });

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

        return { sets };
    }

    async getFileStream(storageKey: string): Promise<Readable> {
        console.log('[CambridgeTestService] getFileStream called', { storageKey });
        return await this.storageProvider.getFileStream(storageKey);
    }

    async getTestsByBookAndSkill(book: string, skill: string): Promise<any> {
        console.log('[CambridgeTestService] getTestsByBookAndSkill called', { book, skill });
        // Translate "20" → "Cambridge 20" for the query
        const bookName = book.match(/^\d+$/) ? `Cambridge ${book}` : book;

        const materials = await MockMaterial.findAll({
            where: {
                book: bookName,
                skill: skill.toUpperCase(),
            },
            order: [['test_number', 'ASC']],
        });

        if (materials.length === 0) {
            return null;
        }

        const firstMaterial = materials[0];
        return {
            book: firstMaterial.book,
            skill: firstMaterial.skill,
            tests: materials.map(m => m.content),
        };
    }

    async gradeTest(payload: GradeTestPayload): Promise<any> {
        const { skill, book, testNumber, answers } = payload;
        console.log('[CambridgeTestService] gradeTest called', { skill, book, testNumber, answerCount: Object.keys(answers || {}).length });
        
        const bookName = book.match(/^\d+$/) ? `Cambridge ${book}` : book;
        
        const materials = await MockMaterial.findAll({
            where: {
                book: bookName,
                skill: skill.toUpperCase(),
            },
            order: [['test_number', 'ASC']],
        });
        
        const material = materials.find(m => m.test_number === testNumber);

        if (!material) {
            throw new Error(`Test not found: ${book} / ${skill} / Test ${testNumber}`);
        }

        const testContent = material.content as any;
        const results: any[] = [];
        const sections = testContent.passages || testContent.parts || [];

        const usedGroupAnswers = new Set<string>();
        let subGroupIdCounter = 0;

        for (const section of sections) {
            const allQuestions: any[] = [];

            if (section.sub_sections && section.sub_sections.length > 0) {
                for (const sub of section.sub_sections) {
                    if (sub.questions) {
                        subGroupIdCounter++;
                        const isMultiSelect = sub.answer_type === 'multiple_choice_multiple';
                        const optionsMap = sub.options || {};
                        allQuestions.push(...sub.questions.map((q: any) => ({
                            ...q,
                            _isMultiSelect: isMultiSelect || q.answer_type === 'multiple_choice_multiple',
                            _subGroupId: subGroupIdCounter,
                            _subQuestions: sub.questions,
                            _optionsMap: optionsMap
                        })));
                    }
                }
            } else if (section.questions && section.questions.length > 0) {
                allQuestions.push(...section.questions);
            }

            for (const q of allQuestions) {
                const qNum = String(q.question_number);
                const correctAnswer = String(q.answer || '').trim();

                if (qNum.includes('-')) {
                    const [start, end] = qNum.split('-').map(Number);
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
                    const lowerUserAns = userAns.toLowerCase();
                    let isCorrect = false;
                    let expectedAnsStr = correctAnswer;

                    if (userAns !== '') {
                        if (q._isMultiSelect && q._subQuestions) {
                            const pool = q._subQuestions.map((sq: any) => String(sq.answer || '').trim().toLowerCase());
                            expectedAnsStr = q._subQuestions.map((sq: any) => sq.answer).join(' / ');

                            if (pool.includes(lowerUserAns) && !usedGroupAnswers.has(`${q._subGroupId}-${lowerUserAns}`)) {
                                isCorrect = true;
                                usedGroupAnswers.add(`${q._subGroupId}-${lowerUserAns}`);
                            }
                        } else {
                            const acceptableAnswers = correctAnswer.split('/').map((s: string) => s.trim().toLowerCase());
                            isCorrect = acceptableAnswers.includes(lowerUserAns);
                        }
                    }

                    const opts = q._optionsMap as Record<string, string> | undefined;
                    const hasOpts = opts && Object.keys(opts).length > 0;

                    const resolveKey = (key: string): string => {
                        if (!hasOpts) return key;
                        if (key.includes(' / ')) {
                            return key.split(' / ').map(k => opts![k.trim()] || k.trim()).join(' / ');
                        }
                        return opts![key] || key;
                    };

                    results.push({
                        questionNumber: qNum,
                        correctAnswer: resolveKey(expectedAnsStr),
                        userAnswer: userAns !== '' ? resolveKey(userAns) : userAns,
                        isCorrect,
                    });
                }
            }
        }

        results.sort((a, b) => {
            const numA = parseInt(a.questionNumber, 10);
            const numB = parseInt(b.questionNumber, 10);
            return numA - numB;
        });

        const correct = results.filter(r => r.isCorrect).length;
        const wrong = results.filter(r => !r.isCorrect && r.userAnswer !== '').length;
        const unanswered = results.filter(r => r.userAnswer === '').length;
        const total = results.length;

        const bandTable = skill.toUpperCase() === 'LISTENING' ? this.LISTENING_BAND_TABLE : this.READING_BAND_TABLE;
        const bandScore = this.rawToBand(correct, bandTable);

        return {
            correct,
            wrong,
            unanswered,
            total,
            bandScore,
            results,
        };
    }
}
