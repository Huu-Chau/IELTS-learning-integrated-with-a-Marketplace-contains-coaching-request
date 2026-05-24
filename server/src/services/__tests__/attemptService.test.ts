import { AttemptService } from '../attemptService';
import Attempt from '../../models/Attempt';

jest.mock('../../models/Attempt', () => ({
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
}));

describe('AttemptService', () => {
    let attemptService: AttemptService;
    let mockStorageProvider: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockStorageProvider = {
            getFileUrl: jest.fn(),
        };
        attemptService = new AttemptService(mockStorageProvider);
    });

    describe('createAttempt', () => {
        it('should create a new attempt and return it', async () => {
            const mockData = { userId: 'user-1', type: 'listening' };
            const mockAttempt = { id: 1, ...mockData };
            (Attempt.create as jest.Mock).mockResolvedValue(mockAttempt);

            const result = await attemptService.createAttempt(mockData as any);

            expect(Attempt.create).toHaveBeenCalledWith(mockData);
            expect(result).toEqual(mockAttempt);
        });

        it('should throw an error if Attempt.create fails', async () => {
            const mockData = { userId: 'user-1', type: 'listening' };
            (Attempt.create as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(attemptService.createAttempt(mockData as any)).rejects.toThrow('DB Error');
        });
    });

    describe('getAttemptsByUser', () => {
        it('should return all attempts for a specific user, most recent first', async () => {
            const userId = 'user-1';
            const mockAttempts = [
                { id: 2, userId, createdAt: new Date() },
                { id: 1, userId, createdAt: new Date(Date.now() - 1000) },
            ];
            (Attempt.findAll as jest.Mock).mockResolvedValue(mockAttempts);

            const result = await attemptService.getAttemptsByUser(userId);

            expect(Attempt.findAll).toHaveBeenCalledWith({
                where: { userId },
                order: [['createdAt', 'DESC']],
            });
            expect(result).toEqual(mockAttempts);
        });

        it('should return an empty array if no attempts are found', async () => {
            const userId = 'user-2';
            (Attempt.findAll as jest.Mock).mockResolvedValue([]);

            const result = await attemptService.getAttemptsByUser(userId);

            expect(result).toEqual([]);
        });

        it('should throw an error if Attempt.findAll fails', async () => {
            (Attempt.findAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(attemptService.getAttemptsByUser('user-1')).rejects.toThrow('DB Error');
        });
    });

    describe('getAttemptById', () => {
        it('should return a single attempt by ID', async () => {
            const id = 123;
            const mockAttempt = { id, userId: 'user-1' };
            (Attempt.findByPk as jest.Mock).mockResolvedValue(mockAttempt);

            const result = await attemptService.getAttemptById(id);

            expect(Attempt.findByPk).toHaveBeenCalledWith(id);
            expect(result).toEqual(mockAttempt);
        });

        it('should return null if attempt is not found', async () => {
            (Attempt.findByPk as jest.Mock).mockResolvedValue(null);

            const result = await attemptService.getAttemptById(404);

            expect(result).toBeNull();
        });

        it('should throw an error if Attempt.findByPk fails', async () => {
            (Attempt.findByPk as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(attemptService.getAttemptById(1)).rejects.toThrow('DB Error');
        });
    });

    describe('updateAttempt', () => {
        it('should update an attempt and return nothing', async () => {
            const id = 1;
            const mockData = { score: 8.5 };
            (Attempt.update as jest.Mock).mockResolvedValue([1]);

            await attemptService.updateAttempt(id, mockData as any);

            expect(Attempt.update).toHaveBeenCalledWith(mockData, { where: { id } });
        });

        it('should throw an error if Attempt.update fails', async () => {
            (Attempt.update as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(attemptService.updateAttempt(1, { score: 9 } as any)).rejects.toThrow('DB Error');
        });
    });

    describe('getRecordingUrl', () => {
        it('should return null if attempt not found', async () => {
            (Attempt.findByPk as jest.Mock).mockResolvedValue(null);
            const result = await attemptService.getRecordingUrl(1, 'user-1');
            expect(result).toBeNull();
        });

        it('should return null if user does not own attempt', async () => {
            (Attempt.findByPk as jest.Mock).mockResolvedValue({ userId: 'other-user' });
            const result = await attemptService.getRecordingUrl(1, 'user-1');
            expect(result).toBeNull();
        });

        it('should return null if attempt has no recording path', async () => {
            (Attempt.findByPk as jest.Mock).mockResolvedValue({ userId: 'user-1', recordingPath: null });
            const result = await attemptService.getRecordingUrl(1, 'user-1');
            expect(result).toBeNull();
        });

        it('should extract object key from full url and get presigned URL', async () => {
            (Attempt.findByPk as jest.Mock).mockResolvedValue({ 
                userId: 'user-1', 
                recordingPath: 'http://minio:9000/ielts-audio/sessions/abcd/123_master.webm' 
            });
            mockStorageProvider.getFileUrl.mockResolvedValue('https://example.com/presigned.webm');

            const result = await attemptService.getRecordingUrl(1, 'user-1');
            
            expect(mockStorageProvider.getFileUrl).toHaveBeenCalledWith('sessions/abcd/123_master.webm', 3600);
            expect(result).toBe('https://example.com/presigned.webm');
        });
    });
});
