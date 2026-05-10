import { WritingEvaluationService } from '../writingEvaluationService';
import { IStorageProvider } from '../storage/IStorageProvider';
import WritingSession from '../../models/WritingSession';
import { Ollama } from 'ollama';
import { WritingSessionStatus } from '../../types/writing-session';

jest.mock('ollama');
jest.mock('../../models/WritingSession');
jest.mock('../writingQuestionBank', () => ({
    getRandomPart1Task: jest.fn(() => ({ prompt: 'p1' })),
    getRandomPart2Task: jest.fn(() => ({ prompt: 'p2' })),
}));

describe('WritingEvaluationService', () => {
    let service: WritingEvaluationService;
    let mockStorage: jest.Mocked<IStorageProvider>;

    beforeEach(() => {
        mockStorage = {
            uploadFile: jest.fn(),
            getFileUrl: jest.fn(),
            getFileStream: jest.fn(),
            deleteFile: jest.fn(),
        };

        service = new WritingEvaluationService(mockStorage);
        jest.clearAllMocks();
    });

    describe('getRandomTask', () => {
        it('should return a task', () => {
            const task = service.getRandomTask('part1');
            expect(task).toBeDefined();
            expect(task.prompt).toBe('p1');
        });
    });

    describe('startSession', () => {
        it('should return existing session id if found', async () => {
            (WritingSession.findOne as jest.Mock).mockResolvedValue({ id: 'existing-id' });
            const id = await service.startSession('u1', 'b1', 1);
            expect(id).toBe('existing-id');
        });

        it('should create new session if not found', async () => {
            (WritingSession.findOne as jest.Mock).mockResolvedValue(null);
            (WritingSession.create as jest.Mock).mockResolvedValue({ id: 'new-id' });
            const id = await service.startSession('u1', 'b1', 1);
            expect(id).toBe('new-id');
            expect(WritingSession.create).toHaveBeenCalled();
        });
    });

    describe('evaluateEssay', () => {
        it('should call Ollama and handle persistence', async () => {
            const mockStream = (async function* () {
                yield { message: { content: 'Overall Band Score: 7.5' } };
            })();
            (Ollama as jest.Mock).mockImplementation(() => ({
                chat: jest.fn().mockResolvedValue(mockStream)
            }));

            const mockSession = {
                id: 'sid',
                save: jest.fn(),
                task1Band: null,
                task2Band: null,
                status: WritingSessionStatus.IN_PROGRESS
            };
            (WritingSession.findByPk as jest.Mock).mockResolvedValue(mockSession);

            const onChunk = jest.fn();
            const payload = {
                essay: 'essay content',
                taskNumber: 1,
                wordCount: 150,
                task: { prompt: 'p1' } as any,
                userId: 'u1'
            };

            await service.evaluateEssay('sid', payload, onChunk);

            expect(onChunk).toHaveBeenCalledWith('Overall Band Score: 7.5');
            expect(mockStorage.uploadFile).toHaveBeenCalledTimes(2);
            expect(mockSession.save).toHaveBeenCalled();
            expect(mockSession.task1Band).toBe(7.5);
        });
    });

    describe('getSessionsByUser', () => {
        it('should query WritingSession', async () => {
            (WritingSession.findAll as jest.Mock).mockResolvedValue([]);
            await service.getSessionsByUser('u1');
            expect(WritingSession.findAll).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId: 'u1', status: WritingSessionStatus.COMPLETED }
            }));
        });
    });

    describe('getSessionDetails', () => {
        it('should return null if session not found', async () => {
            (WritingSession.findByPk as jest.Mock).mockResolvedValue(null);
            const res = await service.getSessionDetails('sid');
            expect(res).toBeNull();
        });

        it('should return details with URLs', async () => {
            const mockSession = {
                toJSON: () => ({ id: 'sid' }),
                task1EssayKey: 'k1'
            };
            (WritingSession.findByPk as jest.Mock).mockResolvedValue(mockSession);
            mockStorage.getFileUrl.mockResolvedValue('url1');

            const res = await service.getSessionDetails('sid');
            expect(res.task1EssayUrl).toBe('url1');
        });
    });
});
