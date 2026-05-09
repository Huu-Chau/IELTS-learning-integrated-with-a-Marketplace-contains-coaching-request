import { Request, Response } from 'express';
import { getTask, startSession, evaluateEssay, getSessionsByUser, getSessionDetails } from '../writingEvaluationController';
import { getRandomPart1Task, getRandomPart2Task } from '../../services/writingQuestionBank';
import { storageProvider } from '../../services/storage/StorageService';
import WritingSession from '../../models/WritingSession';
import { Ollama } from 'ollama';

jest.mock('ollama');
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));
jest.mock('../../services/writingQuestionBank');
jest.mock('../../services/storage/StorageService', () => ({
    storageProvider: {
        uploadFile: jest.fn(),
        getFileUrl: jest.fn()
    }
}));
jest.mock('../../models/WritingSession', () => {
    const mockSession = {
        id: 'session-id',
        userId: 'user123',
        status: 'in-progress',
        task1EssayKey: null,
        task1FeedbackKey: null,
        task1Band: null,
        task2EssayKey: null,
        task2FeedbackKey: null,
        task2Band: null,
        overallBand: null,
        save: jest.fn(),
        toJSON: jest.fn()
    };
    return {
        findOne: jest.fn(),
        create: jest.fn(),
        findByPk: jest.fn(),
        findAll: jest.fn(),
        ...mockSession
    };
});

describe('WritingEvaluationController', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;
    let sendMock: jest.Mock;
    let setHeaderMock: jest.Mock;
    let flushHeadersMock: jest.Mock;
    let writeMock: jest.Mock;
    let endMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        sendMock = jest.fn();
        setHeaderMock = jest.fn();
        flushHeadersMock = jest.fn();
        writeMock = jest.fn();
        endMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock, send: sendMock });
        mockReq = { body: {}, params: {}, query: {} };
        mockRes = { 
            status: statusMock, 
            json: jsonMock, 
            send: sendMock, 
            setHeader: setHeaderMock,
            flushHeaders: flushHeadersMock,
            write: writeMock,
            end: endMock
        };
        jest.clearAllMocks();
    });

    describe('getTask', () => {
        it('should return a part1 task when part=part1', () => {
            const mockTask = { taskType: 'part1', prompt: 'test' };
            (getRandomPart1Task as jest.Mock).mockReturnValue(mockTask);
            mockReq.query = { part: 'part1' };

            getTask(mockReq as Request, mockRes as Response);

            expect(getRandomPart1Task).toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(mockTask);
        });

        it('should return a part2 task when part=part2', () => {
            const mockTask = { taskType: 'part2', prompt: 'test' };
            (getRandomPart2Task as jest.Mock).mockReturnValue(mockTask);
            mockReq.query = { part: 'part2' };

            getTask(mockReq as Request, mockRes as Response);

            expect(getRandomPart2Task).toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(mockTask);
        });

        it('should handle errors', () => {
            (getRandomPart1Task as jest.Mock).mockImplementation(() => { throw new Error('Error'); });
            mockReq.query = { part: 'part1' };

            getTask(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to load writing task.' });
        });
    });

    describe('startSession', () => {
        it('should return 400 if required fields are missing', async () => {
            mockReq.body = { userId: 'user123' }; // missing book, testNumber
            await startSession(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields: userId, book, testNumber.' });
        });

        it('should return existing session if one is in progress', async () => {
            mockReq.body = { userId: 'user123', book: 1, testNumber: 1 };
            const existingSession = { id: 'existing-id' };
            (WritingSession.findOne as jest.Mock).mockResolvedValue(existingSession);

            await startSession(mockReq as Request, mockRes as Response);

            expect(WritingSession.findOne).toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith({ sessionId: 'existing-id' });
        });

        it('should create a new session if none is in progress', async () => {
            mockReq.body = { userId: 'user123', book: 1, testNumber: 1 };
            (WritingSession.findOne as jest.Mock).mockResolvedValue(null);
            (WritingSession.create as jest.Mock).mockResolvedValue({ id: 'mocked-uuid' });

            await startSession(mockReq as Request, mockRes as Response);

            expect(WritingSession.create).toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith({ sessionId: 'mocked-uuid' });
        });

        it('should handle errors', async () => {
            mockReq.body = { userId: 'user123', book: 1, testNumber: 1 };
            (WritingSession.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await startSession(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to start writing session.' });
        });
    });

    describe('evaluateEssay', () => {
        it('should return 400 if required fields are missing', async () => {
            mockReq.params = { sessionId: 'session-id' };
            mockReq.body = { essay: 'text' }; // missing taskNumber, task, userId
            await evaluateEssay(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields: essay, taskNumber, task, sessionId, userId.' });
        });

        it('should stream evaluation and save to MinIO and DB', async () => {
            mockReq.params = { sessionId: 'session-id' };
            mockReq.body = {
                essay: 'test essay',
                taskNumber: 1,
                wordCount: 150,
                task: { prompt: 'write about test' },
                userId: 'user123'
            };

            const mockChatStream = [
                { message: { content: 'Overall Band Score: 7.0. ' } },
                { message: { content: 'Good essay.' } }
            ];

            const mockOllamaChat = jest.fn().mockResolvedValue((async function* () {
                for (const chunk of mockChatStream) yield chunk;
            })());

            (Ollama as jest.Mock).mockImplementation(() => ({
                chat: mockOllamaChat
            }));

            const mockSave = jest.fn();
            (WritingSession.findByPk as jest.Mock).mockResolvedValue({
                id: 'session-id',
                task1Band: null,
                task2Band: null,
                status: 'in-progress',
                save: mockSave
            });

            await evaluateEssay(mockReq as Request, mockRes as Response);

            expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
            expect(flushHeadersMock).toHaveBeenCalled();
            expect(mockOllamaChat).toHaveBeenCalled();
            expect(writeMock).toHaveBeenCalled();
            expect(storageProvider.uploadFile).toHaveBeenCalledTimes(2); // essay + feedback
            expect(mockSave).toHaveBeenCalled();
            expect(endMock).toHaveBeenCalled();
        });

        it('should handle ollama error and end stream gracefully', async () => {
            mockReq.params = { sessionId: 'session-id' };
            mockReq.body = {
                essay: 'test essay',
                taskNumber: 1,
                wordCount: 150,
                task: { prompt: 'write about test' },
                userId: 'user123'
            };

            const mockOllamaChat = jest.fn().mockRejectedValue(new Error('Ollama connection failed'));

            (Ollama as jest.Mock).mockImplementation(() => ({
                chat: mockOllamaChat
            }));

            await evaluateEssay(mockReq as Request, mockRes as Response);

            expect(writeMock).toHaveBeenCalledWith(`data: {"error":"Evaluation failed. Is Ollama running?"}\n\n`);
            expect(endMock).toHaveBeenCalled();
        });
    });

    describe('getSessionsByUser', () => {
        it('should return user sessions', async () => {
            mockReq.params = { userId: 'user123' };
            const mockSessions = [{ id: '1' }, { id: '2' }];
            (WritingSession.findAll as jest.Mock).mockResolvedValue(mockSessions);

            await getSessionsByUser(mockReq as Request, mockRes as Response);

            expect(WritingSession.findAll).toHaveBeenCalledWith({
                where: { userId: 'user123', status: 'completed' },
                order: [['createdAt', 'DESC']]
            });
            expect(jsonMock).toHaveBeenCalledWith(mockSessions);
        });

        it('should handle errors', async () => {
            mockReq.params = { userId: 'user123' };
            (WritingSession.findAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await getSessionsByUser(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to fetch writing sessions.' });
        });
    });

    describe('getSessionDetails', () => {
        it('should return 404 if session not found', async () => {
            mockReq.params = { sessionId: 'invalid' };
            (WritingSession.findByPk as jest.Mock).mockResolvedValue(null);

            await getSessionDetails(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Session not found.' });
        });

        it('should return session details with presigned urls', async () => {
            mockReq.params = { sessionId: 'session-id' };
            const mockSession = {
                id: 'session-id',
                task1EssayKey: 'key1',
                task1FeedbackKey: 'key2',
                toJSON: () => ({ id: 'session-id' })
            };
            (WritingSession.findByPk as jest.Mock).mockResolvedValue(mockSession);
            (storageProvider.getFileUrl as jest.Mock).mockResolvedValue('presigned-url');

            await getSessionDetails(mockReq as Request, mockRes as Response);

            expect(storageProvider.getFileUrl).toHaveBeenCalledTimes(2);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                id: 'session-id',
                task1EssayUrl: 'presigned-url',
                task1FeedbackUrl: 'presigned-url'
            }));
        });

        it('should handle errors', async () => {
            mockReq.params = { sessionId: 'session-id' };
            (WritingSession.findByPk as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await getSessionDetails(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to fetch session details.' });
        });
    });
});
