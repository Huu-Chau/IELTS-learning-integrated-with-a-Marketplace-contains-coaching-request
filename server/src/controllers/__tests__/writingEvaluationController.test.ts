import { Request, Response, NextFunction } from 'express';
import { WritingEvaluationController } from '../writingEvaluationController';
import { IWritingEvaluationService } from '../../services/writingEvaluationService';
import { WritingPart, WritingTask } from '../../types/ai-types';

describe('WritingEvaluationController', () => {
    let controller: WritingEvaluationController;
    let mockService: jest.Mocked<IWritingEvaluationService>;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockService = {
            getRandomTask: jest.fn(),
            startSession: jest.fn(),
            evaluateEssay: jest.fn(),
            getSessionsByUser: jest.fn(),
            getSessionDetails: jest.fn(),
        } as any;

        controller = new WritingEvaluationController(mockService);

        mockReq = {
            body: {},
            params: {},
            query: {},
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
            flushHeaders: jest.fn(),
            write: jest.fn(),
            end: jest.fn(),
        } as any;

        mockNext = jest.fn();
    });

    describe('getTask', () => {
        it('should call service.getRandomTask and return task', async () => {
            const mockTask: WritingTask = { part: 'part1', taskType: 'Line Graph', prompt: 'test prompt' };
            mockService.getRandomTask.mockReturnValue(mockTask);
            mockReq.query = { part: 'part1' };

            await controller.getTask(mockReq as Request, mockRes as Response, mockNext);

            expect(mockService.getRandomTask).toHaveBeenCalledWith('part1');
            expect(mockRes.json).toHaveBeenCalledWith(mockTask);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should call next(error) on failure', async () => {
            const error = new Error('Service Error');
            mockService.getRandomTask.mockImplementation(() => { throw error; });

            await controller.getTask(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('startSession', () => {
        it('should return 400 if fields are missing', async () => {
            mockReq.body = { userId: 'user1' }; // missing book, testNumber

            await controller.startSession(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: expect.any(String) });
        });

        it('should call service.startSession and return sessionId', async () => {
            mockReq.body = { userId: 'user1', book: 'Cam 18', testNumber: 1 };
            mockService.startSession.mockResolvedValue('session-uuid');

            await controller.startSession(mockReq as Request, mockRes as Response, mockNext);

            expect(mockService.startSession).toHaveBeenCalledWith('user1', 'Cam 18', 1);
            expect(mockRes.json).toHaveBeenCalledWith({ sessionId: 'session-uuid' });
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('evaluateEssay', () => {
        it('should return 400 if fields are missing', async () => {
            mockReq.params = { sessionId: 'sid' };
            mockReq.body = { essay: 'text' }; // missing taskNumber, etc.

            await controller.evaluateEssay(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should set headers and call service.evaluateEssay', async () => {
            mockReq.params = { sessionId: 'sid' };
            mockReq.body = {
                essay: 'my essay',
                taskNumber: 1,
                wordCount: 200,
                task: { prompt: 'task prompt' },
                userId: 'user1'
            };

            mockService.evaluateEssay.mockImplementation(async (sid, payload, onChunk) => {
                onChunk('chunk1');
                onChunk('chunk2');
            });

            await controller.evaluateEssay(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
            expect(mockRes.write).toHaveBeenCalledTimes(3); // 2 chunks + done
            expect(mockRes.end).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle service errors gracefully in SSE', async () => {
            mockReq.params = { sessionId: 'sid' };
            mockReq.body = {
                essay: 'my essay',
                taskNumber: 1,
                wordCount: 200,
                task: { prompt: 'task prompt' },
                userId: 'user1'
            };

            const error = new Error('AI Error');
            mockService.evaluateEssay.mockRejectedValue(error);

            await controller.evaluateEssay(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.write).toHaveBeenCalledWith(expect.stringContaining('Evaluation failed'));
            expect(mockRes.end).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getSessionsByUser', () => {
        it('should return sessions from service', async () => {
            mockReq.params = { userId: 'user1' };
            const mockSessions = [{ id: 's1' }] as any;
            mockService.getSessionsByUser.mockResolvedValue(mockSessions);

            await controller.getSessionsByUser(mockReq as Request, mockRes as Response, mockNext);

            expect(mockService.getSessionsByUser).toHaveBeenCalledWith('user1');
            expect(mockRes.json).toHaveBeenCalledWith(mockSessions);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('getSessionDetails', () => {
        it('should return 404 if not found', async () => {
            mockReq.params = { sessionId: 'sid' };
            mockService.getSessionDetails.mockResolvedValue(null);

            await controller.getSessionDetails(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return details if found', async () => {
            mockReq.params = { sessionId: 'sid' };
            const mockDetails = { id: 'sid', url: '...' };
            mockService.getSessionDetails.mockResolvedValue(mockDetails);

            await controller.getSessionDetails(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith(mockDetails);
            expect(mockNext).toHaveBeenCalled();
        });
    });
});
