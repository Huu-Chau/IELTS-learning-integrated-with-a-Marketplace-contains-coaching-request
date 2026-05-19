import { Request, Response, NextFunction } from 'express';
import { AttemptController } from '../attemptController';
import { IAttemptService } from '../../services/attemptService';
import { CreateAttemptPayload } from '../../types/attempt';

describe('AttemptController', () => {
  let attemptController: AttemptController;
  let mockAttemptService: jest.Mocked<IAttemptService>;
  let mockReq: Partial<Request> & { user?: any; file?: any };
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockAttemptService = {
      createAttempt: jest.fn(),
      getAttemptsByUser: jest.fn(),
      getAttemptById: jest.fn(),
      updateAttempt: jest.fn(),
    };
    attemptController = new AttemptController(mockAttemptService);

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockNext = jest.fn();
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

      const mockAttempt = { id: 1, type: 'practice' } as any;
      mockAttemptService.createAttempt.mockResolvedValue(mockAttempt);

      await attemptController.create(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAttemptService.createAttempt).toHaveBeenCalledWith(expect.any(CreateAttemptPayload));
      const payload = mockAttemptService.createAttempt.mock.calls[0][0];
      expect(payload.userId).toBe('user123');
      expect(payload.recordingPath).toBe('/uploads/recordings/audio-123.mp3');
      
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockAttempt);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should parse stringified answers', async () => {
      mockReq.user = { uid: 'user123' };
      mockReq.body = { type: 'practice', testId: 'test1', answers: '{"q1":"A"}' };

      mockAttemptService.createAttempt.mockResolvedValue({ id: 1 } as any);

      await attemptController.create(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAttemptService.createAttempt).toHaveBeenCalledWith(expect.objectContaining({
        answers: { q1: 'A' },
      }));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 400 for manual result without score', async () => {
      mockReq.body = { type: 'manual', answers: {} };

      await attemptController.create(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Manual result must include an overall score' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 for manual result without answers', async () => {
      mockReq.body = { type: 'manual', score: 7.5 };

      await attemptController.create(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Manual result must include band scores in answers' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 on service error', async () => {
      mockReq.body = { type: 'practice', answers: {} };
      mockAttemptService.createAttempt.mockRejectedValue(new Error('Service failed'));

      await attemptController.create(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Service failed' });
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getByUser', () => {
    it('should return user attempts', async () => {
      mockReq.params = { uid: 'user123' };
      const mockAttempts = [{ id: 1 }, { id: 2 }] as any;
      mockAttemptService.getAttemptsByUser.mockResolvedValue(mockAttempts);

      await attemptController.getByUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAttemptService.getAttemptsByUser).toHaveBeenCalledWith('user123');
      expect(jsonMock).toHaveBeenCalledWith(mockAttempts);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 500 on error', async () => {
      mockReq.params = { uid: 'user123' };
      mockAttemptService.getAttemptsByUser.mockRejectedValue(new Error('DB error'));

      await attemptController.getByUser(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getById', () => {
    it('should return attempt if found', async () => {
      mockReq.params = { id: '123' };
      const mockAttempt = { id: 123, type: 'practice' } as any;
      mockAttemptService.getAttemptById.mockResolvedValue(mockAttempt);

      await attemptController.getById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAttemptService.getAttemptById).toHaveBeenCalledWith(123);
      expect(jsonMock).toHaveBeenCalledWith(mockAttempt);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 404 if attempt not found', async () => {
      mockReq.params = { id: '123' };
      mockAttemptService.getAttemptById.mockResolvedValue(null);

      await attemptController.getById(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Attempt not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 on error', async () => {
      mockReq.params = { id: '123' };
      mockAttemptService.getAttemptById.mockRejectedValue(new Error('Error finding attempt'));

      await attemptController.getById(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error finding attempt' });
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
