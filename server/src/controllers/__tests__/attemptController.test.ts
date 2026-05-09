import { Request, Response } from 'express';
import { attemptController } from '../attemptController';
import { attemptService } from '../../services/attemptService';

jest.mock('../../services/attemptService', () => ({
  attemptService: {
    createAttempt: jest.fn(),
    getAttemptsByUser: jest.fn(),
    getAttemptById: jest.fn(),
  },
}));

describe('attemptController', () => {
  let mockReq: Partial<Request> & { user?: any; file?: any };
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {
      params: {},
      body: {},
    };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should handle file upload and convert recording path', async () => {
      mockReq.user = { uid: 'user123' };
      mockReq.body = { type: 'practice', testId: 'test1', answers: {} };
      mockReq.file = { filename: 'audio-123.mp3' };

      const mockAttempt = { id: 1, type: 'practice' };
      (attemptService.createAttempt as jest.Mock).mockResolvedValue(mockAttempt);

      await attemptController.create(mockReq as Request, mockRes as Response);

      expect(attemptService.createAttempt).toHaveBeenCalledWith({
        userId: 'user123',
        type: 'practice',
        testId: 'test1',
        score: undefined,
        feedback: undefined,
        answers: {},
        recordingPath: '/uploads/recordings/audio-123.mp3',
      });
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockAttempt);
    });

    it('should parse stringified answers', async () => {
      mockReq.user = { uid: 'user123' };
      mockReq.body = { type: 'practice', testId: 'test1', answers: '{"q1":"A"}' };

      (attemptService.createAttempt as jest.Mock).mockResolvedValue({ id: 1 });

      await attemptController.create(mockReq as Request, mockRes as Response);

      expect(attemptService.createAttempt).toHaveBeenCalledWith(expect.objectContaining({
        answers: { q1: 'A' },
      }));
    });

    it('should return 400 for manual result without score', async () => {
      mockReq.body = { type: 'manual', answers: {} };

      await attemptController.create(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Manual result must include an overall score' });
    });

    it('should return 400 for manual result without answers', async () => {
      mockReq.body = { type: 'manual', score: 7.5 };

      await attemptController.create(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Manual result must include band scores in answers' });
    });

    it('should return 500 on service error', async () => {
      mockReq.body = { type: 'practice', answers: {} };
      (attemptService.createAttempt as jest.Mock).mockRejectedValue(new Error('Service failed'));

      await attemptController.create(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Service failed' });
    });
  });

  describe('getByUser', () => {
    it('should return user attempts', async () => {
      mockReq.params = { uid: 'user123' };
      const mockAttempts = [{ id: 1 }, { id: 2 }];
      (attemptService.getAttemptsByUser as jest.Mock).mockResolvedValue(mockAttempts);

      await attemptController.getByUser(mockReq as Request, mockRes as Response);

      expect(attemptService.getAttemptsByUser).toHaveBeenCalledWith('user123');
      expect(jsonMock).toHaveBeenCalledWith(mockAttempts);
    });

    it('should return 500 on error', async () => {
      mockReq.params = { uid: 'user123' };
      (attemptService.getAttemptsByUser as jest.Mock).mockRejectedValue(new Error('DB error'));

      await attemptController.getByUser(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getById', () => {
    it('should return attempt if found', async () => {
      mockReq.params = { id: '123' };
      const mockAttempt = { id: 123, type: 'practice' };
      (attemptService.getAttemptById as jest.Mock).mockResolvedValue(mockAttempt);

      await attemptController.getById(mockReq as Request, mockRes as Response);

      expect(attemptService.getAttemptById).toHaveBeenCalledWith(123);
      expect(jsonMock).toHaveBeenCalledWith(mockAttempt);
    });

    it('should return 404 if attempt not found', async () => {
      mockReq.params = { id: '123' };
      (attemptService.getAttemptById as jest.Mock).mockResolvedValue(null);

      await attemptController.getById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Attempt not found' });
    });

    it('should return 500 on error', async () => {
      mockReq.params = { id: '123' };
      (attemptService.getAttemptById as jest.Mock).mockRejectedValue(new Error('Error finding attempt'));

      await attemptController.getById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error finding attempt' });
    });
  });
});
