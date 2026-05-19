import { Request, Response, NextFunction } from 'express';
import { CambridgeTestController } from '../CambridgeTestController';
import { ICambridgeTestService } from '../../services/cambridgeTestService';

describe('CambridgeTestController', () => {
    let controller: CambridgeTestController;
    let mockService: jest.Mocked<ICambridgeTestService>;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;
    let setHeaderMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        setHeaderMock = jest.fn();
        mockReq = {
            params: {},
            query: {},
            body: {}
        };
        mockRes = {
            status: statusMock,
            json: jsonMock,
            setHeader: setHeaderMock,
        } as any;
        mockNext = jest.fn();

        mockService = {
            getSetsBySkill: jest.fn(),
            getFileStream: jest.fn(),
            getTestsByBookAndSkill: jest.fn(),
            gradeTest: jest.fn()
        };

        controller = new CambridgeTestController(mockService);
    });

    describe('getSets', () => {
        it('should return test sets for a skill', async () => {
            const mockResult = { sets: [{ id: 'cam-20', name: 'Cambridge 20', tests: [] }] };
            mockReq.params = { skill: 'listening' };
            mockService.getSetsBySkill.mockResolvedValue(mockResult);

            await controller.getSets(mockReq as Request, mockRes as Response, mockNext);

            expect(mockService.getSetsBySkill).toHaveBeenCalledWith('listening');
            expect(jsonMock).toHaveBeenCalledWith(mockResult);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 500 if service fails', async () => {
            mockReq.params = { skill: 'listening' };
            mockService.getSetsBySkill.mockRejectedValue(new Error('DB Error'));

            await controller.getSets(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to fetch test sets' });
        });
    });

    describe('getStream', () => {
        it('should return 400 if key is missing', async () => {
            mockReq.query = {};

            await controller.getStream(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing key parameter' });
        });

        it('should stream the file with correct mime type for mp3', async () => {
            mockReq.query = { key: 'test.mp3' };
            const mockStream = { pipe: jest.fn() } as any;
            mockService.getFileStream.mockResolvedValue(mockStream);

            await controller.getStream(mockReq as Request, mockRes as Response, mockNext);

            expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
            expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
        });

        it('should stream the file with correct mime type for png', async () => {
            mockReq.query = { key: 'test.png' };
            const mockStream = { pipe: jest.fn() } as any;
            mockService.getFileStream.mockResolvedValue(mockStream);

            await controller.getStream(mockReq as Request, mockRes as Response, mockNext);

            expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'image/png');
        });

        it('should return 404 if file not found', async () => {
            mockReq.query = { key: 'missing.mp3' };
            mockService.getFileStream.mockRejectedValue(new Error('Not found'));

            await controller.getStream(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'File not found in MinIO' });
        });
    });

    describe('getImage', () => {
        it('should stream image file', async () => {
            mockReq.params = { book: '20', file: 'test.jpg' };
            const mockStream = { pipe: jest.fn() } as any;
            mockService.getFileStream.mockResolvedValue(mockStream);

            await controller.getImage(mockReq as Request, mockRes as Response, mockNext);

            expect(mockService.getFileStream).toHaveBeenCalledWith('mock-test/cam20/test.jpg');
            expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
            expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
        });

        it('should return 404 if image not found', async () => {
            mockReq.params = { book: '20', file: 'missing.jpg' };
            mockService.getFileStream.mockRejectedValue(new Error('Not found'));

            await controller.getImage(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Image file not found' });
        });
    });

    describe('grade', () => {
        it('should return 400 if required fields are missing', async () => {
            mockReq.body = { skill: 'listening' };

            await controller.grade(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields: skill, book, testNumber, answers' });
        });

        it('should grade test and return result', async () => {
            const mockPayload = { skill: 'listening', book: '20', testNumber: 1, answers: { '1': 'A' } };
            const mockResult = { correct: 1, total: 40 };
            mockReq.body = mockPayload;
            mockService.gradeTest.mockResolvedValue(mockResult);

            await controller.grade(mockReq as Request, mockRes as Response, mockNext);

            expect(mockService.gradeTest).toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(mockResult);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 404 if test not found', async () => {
            mockReq.body = { skill: 'listening', book: '20', testNumber: 99, answers: {} };
            mockService.gradeTest.mockRejectedValue(new Error('Test not found: 20 / listening / Test 99'));

            await controller.grade(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Test not found: 20 / listening / Test 99' });
        });

        it('should return 500 if grading fails for other reasons', async () => {
            mockReq.body = { skill: 'listening', book: '20', testNumber: 1, answers: {} };
            mockService.gradeTest.mockRejectedValue(new Error('Unexpected error'));

            await controller.grade(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to grade test' });
        });
    });

    describe('getTest', () => {
        it('should return test data', async () => {
            const mockResult = { book: 'Cambridge 20', skill: 'LISTENING', tests: [] };
            mockReq.params = { skill: 'listening', book: '20' };
            mockService.getTestsByBookAndSkill.mockResolvedValue(mockResult);

            await controller.getTest(mockReq as Request, mockRes as Response, mockNext);

            expect(mockService.getTestsByBookAndSkill).toHaveBeenCalledWith('20', 'listening');
            expect(jsonMock).toHaveBeenCalledWith(mockResult);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 404 if no tests found', async () => {
            mockReq.params = { skill: 'listening', book: '99' };
            mockService.getTestsByBookAndSkill.mockResolvedValue(null);

            await controller.getTest(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'No tests found for listening / book 99' });
        });

        it('should return 500 if service fails', async () => {
            mockReq.params = { skill: 'listening', book: '20' };
            mockService.getTestsByBookAndSkill.mockRejectedValue(new Error('DB Error'));

            await controller.getTest(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to read test data' });
        });
    });
});
