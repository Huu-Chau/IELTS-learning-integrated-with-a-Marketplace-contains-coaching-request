import { Readable } from 'stream';
import MockMaterial from '../../models/MockMaterial';
import { CambridgeTestServiceV2, ICambridgeTestService } from '../cambridgeTestService';
import { IStorageProvider } from '../storage/IStorageProvider';

jest.mock('../../models/MockMaterial', () => ({
    findAll: jest.fn(),
}));

describe('CambridgeTestService', () => {
    let service: ICambridgeTestService;
    let mockStorageProvider: jest.Mocked<IStorageProvider>;

    beforeEach(() => {
        mockStorageProvider = {
            getFileStream: jest.fn(),
            uploadFile: jest.fn(),
            getFileUrl: jest.fn(),
            deleteFile: jest.fn(),
        } as any;
        service = new CambridgeTestServiceV2(mockStorageProvider);
        jest.clearAllMocks();
    });

    describe('getSetsBySkill', () => {
        it('should return grouped test sets sorted by book number descending', async () => {
            const mockMaterials = [
                { book: 'Cambridge 18', test_number: 1, skill: 'READING' },
                { book: 'Cambridge 18', test_number: 2, skill: 'READING' },
                { book: 'Cambridge 19', test_number: 1, skill: 'READING' },
            ];
            (MockMaterial.findAll as jest.Mock).mockResolvedValue(mockMaterials);

            const result = await service.getSetsBySkill('reading');

            expect(MockMaterial.findAll).toHaveBeenCalledWith({
                where: { skill: 'READING' },
                order: [['book', 'ASC'], ['test_number', 'ASC']],
            });
            expect(result.sets).toHaveLength(2);
            expect(result.sets[0].id).toBe('cambridge-19');
            expect(result.sets[1].id).toBe('cambridge-18');
            expect(result.sets[1].tests).toHaveLength(2);
        });
    });

    describe('getFileStream', () => {
        it('should return a readable stream from storage provider', async () => {
            const mockStream = new Readable();
            mockStorageProvider.getFileStream.mockResolvedValue(mockStream);

            const result = await service.getFileStream('test-key');

            expect(mockStorageProvider.getFileStream).toHaveBeenCalledWith('test-key');
            expect(result).toBe(mockStream);
        });
    });

    describe('getTestsByBookAndSkill', () => {
        it('should return tests for a specific book and skill', async () => {
            const mockMaterials = [
                { book: 'Cambridge 18', skill: 'READING', content: { passage: 1 } },
                { book: 'Cambridge 18', skill: 'READING', content: { passage: 2 } },
            ];
            (MockMaterial.findAll as jest.Mock).mockResolvedValue(mockMaterials);

            const result = await service.getTestsByBookAndSkill('18', 'reading');

            expect(MockMaterial.findAll).toHaveBeenCalledWith({
                where: {
                    book: 'Cambridge 18',
                    skill: 'READING',
                },
                order: [['test_number', 'ASC']],
            });
            expect(result.book).toBe('Cambridge 18');
            expect(result.tests).toHaveLength(2);
            expect(result.tests[0]).toEqual({ passage: 1 });
        });

        it('should return null if no materials found', async () => {
            (MockMaterial.findAll as jest.Mock).mockResolvedValue([]);

            const result = await service.getTestsByBookAndSkill('99', 'reading');

            expect(result).toBeNull();
        });
    });

    describe('gradeTest', () => {
        const mockTestContent = {
            passages: [
                {
                    questions: [
                        { question_number: 1, answer: 'A' },
                        { question_number: 2, answer: 'B / C' },
                        { question_number: '3-4', answer: 'D / E' },
                    ]
                }
            ]
        };

        const mockMaterial = {
            test_number: 1,
            content: mockTestContent
        };

        it('should grade a test correctly and calculate band score', async () => {
            (MockMaterial.findAll as jest.Mock).mockResolvedValue([mockMaterial]);

            const payload = {
                skill: 'READING',
                book: '18',
                testNumber: 1,
                answers: {
                    '1': 'A',
                    '2': 'B', // Correct because it's in 'B / C'
                    '3': 'D', // Correct from '3-4' -> 'D / E'
                    '4': 'wrong'
                }
            };

            const result = await service.gradeTest(payload);

            expect(result.correct).toBe(3);
            expect(result.wrong).toBe(1);
            expect(result.total).toBe(4);
            expect(result.bandScore).toBeGreaterThan(0);
        });

        it('should handle multi-select questions correctly', async () => {
            const multiSelectContent = {
                passages: [
                    {
                        sub_sections: [
                            {
                                answer_type: 'multiple_choice_multiple',
                                questions: [
                                    { question_number: 5, answer: 'A' },
                                    { question_number: 6, answer: 'B' },
                                ]
                            }
                        ]
                    }
                ]
            };
            (MockMaterial.findAll as jest.Mock).mockResolvedValue([{
                test_number: 1,
                content: multiSelectContent
            }]);

            const payload = {
                skill: 'LISTENING',
                book: '18',
                testNumber: 1,
                answers: {
                    '5': 'B', // Correct because it's in the group
                    '6': 'A', // Correct because it's in the group
                }
            };

            const result = await service.gradeTest(payload);

            expect(result.correct).toBe(2);
            expect(result.results.find((r: any) => r.questionNumber === '5').isCorrect).toBe(true);
            expect(result.results.find((r: any) => r.questionNumber === '6').isCorrect).toBe(true);
        });

        it('should handle multi-select questions with duplicates correctly', async () => {
            const multiSelectContent = {
                passages: [
                    {
                        sub_sections: [
                            {
                                answer_type: 'multiple_choice_multiple',
                                questions: [
                                    { question_number: 5, answer: 'A' },
                                    { question_number: 6, answer: 'B' },
                                ]
                            }
                        ]
                    }
                ]
            };
            (MockMaterial.findAll as jest.Mock).mockResolvedValue([{
                test_number: 1,
                content: multiSelectContent
            }]);

            const payload = {
                skill: 'LISTENING',
                book: '18',
                testNumber: 1,
                answers: {
                    '5': 'A',
                    '6': 'A', // Duplicate 'A' should be wrong for one of them
                }
            };

            const result = await service.gradeTest(payload);

            expect(result.correct).toBe(1);
        });

        it('should throw error if test not found', async () => {
            (MockMaterial.findAll as jest.Mock).mockResolvedValue([]);

            const payload = {
                skill: 'READING',
                book: '18',
                testNumber: 99,
                answers: {}
            };

            await expect(service.gradeTest(payload)).rejects.toThrow('Test not found');
        });

        it('should use options map to resolve labels', async () => {
            const contentWithOptions = {
                passages: [
                    {
                        sub_sections: [
                            {
                                options: { 'A': 'Option A Text' },
                                questions: [
                                    { question_number: 1, answer: 'A' },
                                ]
                            }
                        ]
                    }
                ]
            };
            (MockMaterial.findAll as jest.Mock).mockResolvedValue([{
                test_number: 1,
                content: contentWithOptions
            }]);

            const payload = {
                skill: 'READING',
                book: '18',
                testNumber: 1,
                answers: { '1': 'A' }
            };

            const result = await service.gradeTest(payload);

            expect(result.results[0].correctAnswer).toBe('Option A Text');
            expect(result.results[0].userAnswer).toBe('Option A Text');
        });
    });
});
