import request from 'supertest';
import express from 'express';
import { Readable } from 'stream';
import router from '../cambridgeTestRoutes';
import { storageProvider } from '../../services/storage/StorageService';
import MockMaterial from '../../models/MockMaterial';

// Mock dependencies
jest.mock('../../models/MockMaterial');
jest.mock('../../services/storage/StorageService', () => ({
    storageProvider: {
        getFileStream: jest.fn(),
    },
}));

const app = express();
app.use(express.json());
app.use('/api', router);

describe('cambridgeTestRoutes', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /sets/:skill', () => {
        it('should return grouped test sets sorted by book number descending', async () => {
            const mockMaterials = [
                { book: 'Cambridge 19', test_number: 1, skill: 'reading' },
                { book: 'Cambridge 20', test_number: 1, skill: 'reading' },
                { book: 'Cambridge 20', test_number: 2, skill: 'reading' },
            ];
            (MockMaterial.findAll as jest.Mock).mockResolvedValue(mockMaterials);

            const response = await request(app).get('/api/sets/reading');

            expect(response.status).toBe(200);
            expect(response.body.sets).toHaveLength(2);
            // Cambridge 20 should come first
            expect(response.body.sets[0].id).toBe('cambridge-20');
            expect(response.body.sets[0].tests).toHaveLength(2);
            expect(response.body.sets[1].id).toBe('cambridge-19');
            expect(MockMaterial.findAll).toHaveBeenCalled();
        });

        it('should return 500 if database query fails', async () => {
            (MockMaterial.findAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

            const response = await request(app).get('/api/sets/listening');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to fetch test sets');
        });
    });

    describe('GET /stream', () => {
        it('should stream file from MinIO with correct Content-Type', async () => {
            const mockStream = new Readable();
            mockStream.push('fake audio content');
            mockStream.push(null);
            (storageProvider.getFileStream as jest.Mock).mockResolvedValue(mockStream);

            const response = await request(app).get('/api/stream?key=audio/test.mp3');

            expect(response.status).toBe(200);
            expect(response.header['content-type']).toBe('audio/mpeg');
            expect(response.header['accept-ranges']).toBe('bytes');
            expect(storageProvider.getFileStream).toHaveBeenCalledWith('audio/test.mp3');
        });

        it('should return 400 if key parameter is missing', async () => {
            const response = await request(app).get('/api/stream');
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Missing key parameter');
        });

        it('should return 404 if storage provider fails to find file', async () => {
            (storageProvider.getFileStream as jest.Mock).mockRejectedValue(new Error('File not found'));
            const response = await request(app).get('/api/stream?key=nonexistent.png');
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('File not found in MinIO');
        });
    });

    describe('GET /image/:book/:file', () => {
        it('should stream image from MinIO with inferred mime type', async () => {
            const mockStream = new Readable();
            mockStream.push('fake image content');
            mockStream.push(null);
            (storageProvider.getFileStream as jest.Mock).mockResolvedValue(mockStream);

            const response = await request(app).get('/api/image/20/map.png');

            expect(response.status).toBe(200);
            expect(response.header['content-type']).toBe('image/png');
            expect(storageProvider.getFileStream).toHaveBeenCalledWith('mock-test/cam20/map.png');
        });

        it('should return 404 if image stream fails', async () => {
            (storageProvider.getFileStream as jest.Mock).mockRejectedValue(new Error('Storage Error'));
            const response = await request(app).get('/api/image/20/missing.jpg');
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Image file not found');
        });
    });

    describe('POST /grade', () => {
        const mockTestContent = {
            passages: [
                {
                    sub_sections: [
                        {
                            questions: [
                                { question_number: 1, answer: 'TRUE' },
                                { question_number: 2, answer: 'B' },
                                { question_number: '3-4', answer: 'NOT GIVEN / FALSE' }
                            ]
                        },
                        {
                            answer_type: 'multiple_choice_multiple',
                            questions: [
                                { question_number: 5, answer: 'A' },
                                { question_number: 6, answer: 'C' }
                            ]
                        }
                    ]
                }
            ]
        };

        it('should grade standard, grouped and multi-select questions correctly', async () => {
            (MockMaterial.findAll as jest.Mock).mockResolvedValue([
                { test_number: 1, content: mockTestContent }
            ]);

            const answers = {
                '1': 'true',       // Correct (case insensitive)
                '2': 'C',          // Wrong
                '3': 'NOT GIVEN',  // Correct
                '4': 'FALSE',      // Correct
                '5': 'C',          // Correct (it's a pool, 5 & 6 accept A or C)
                '6': 'A'           // Correct
            };

            const response = await request(app)
                .post('/api/grade')
                .send({
                    skill: 'reading',
                    book: '20',
                    testNumber: 1,
                    answers
                });

            expect(response.status).toBe(200);
            expect(response.body.correct).toBe(5); // 1, 3, 4, 5, 6
            expect(response.body.total).toBe(6);
            expect(response.body.results).toHaveLength(6);
            expect(response.body.bandScore).toBeGreaterThan(0);
        });

        it('should handle options mapping in grading', async () => {
            const contentWithOptions = {
                passages: [{
                    sub_sections: [{
                        options: { 'A': 'Option A Text', 'B': 'Option B Text' },
                        questions: [{ question_number: 7, answer: 'A' }]
                    }]
                }]
            };
            (MockMaterial.findAll as jest.Mock).mockResolvedValue([
                { test_number: 1, content: contentWithOptions }
            ]);

            const response = await request(app)
                .post('/api/grade')
                .send({
                    skill: 'listening',
                    book: '18',
                    testNumber: 1,
                    answers: { '7': 'A' }
                });

            expect(response.status).toBe(200);
            expect(response.body.results[0].correctAnswer).toBe('Option A Text');
            expect(response.body.results[0].userAnswer).toBe('Option A Text');
        });

        it('should return 400 if required fields are missing', async () => {
            const response = await request(app).post('/api/grade').send({ skill: 'reading' });
            expect(response.status).toBe(400);
        });

        it('should return 404 if test material is not found', async () => {
            (MockMaterial.findAll as jest.Mock).mockResolvedValue([]);
            const response = await request(app)
                .post('/api/grade')
                .send({ skill: 'reading', book: '99', testNumber: 1, answers: {} });
            expect(response.status).toBe(404);
        });
    });

    describe('GET /:skill/:book', () => {
        it('should return full test data for a book and skill', async () => {
            const mockMaterials = [
                { book: '20', skill: 'reading', content: { test: 1 } },
                { book: '20', skill: 'reading', content: { test: 2 } }
            ];
            (MockMaterial.findAll as jest.Mock).mockResolvedValue(mockMaterials);

            const response = await request(app).get('/api/reading/20');

            expect(response.status).toBe(200);
            expect(response.body.book).toBe('20');
            expect(response.body.tests).toHaveLength(2);
            expect(MockMaterial.findAll).toHaveBeenCalled();
        });

        it('should return 404 if no materials match', async () => {
            (MockMaterial.findAll as jest.Mock).mockResolvedValue([]);
            const response = await request(app).get('/api/listening/15');
            expect(response.status).toBe(404);
        });

        it('should return 500 if database error occurs', async () => {
            (MockMaterial.findAll as jest.Mock).mockRejectedValue(new Error('Fail'));
            const response = await request(app).get('/api/reading/20');
            expect(response.status).toBe(500);
        });
    });
});
