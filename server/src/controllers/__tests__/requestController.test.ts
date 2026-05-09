import { Request, Response } from 'express';
import { requestController } from '../requestController';
import { requestService } from '../../services/requestService';

jest.mock('../../services/requestService', () => ({
  requestService: {
    getOpenRequests: jest.fn(),
    getRequestsForTeacher: jest.fn(),
    getRequestsByStudent: jest.fn(),
    updateRequestStatus: jest.fn(),
  },
}));

describe('requestController', () => {
  let mockReq: Partial<Request> & { user?: any };
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {
      params: {},
      body: {},
      user: { uid: 'user123', email: 'test@test.com' } as any,
    };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    jest.clearAllMocks();
  });

  describe('getOpen', () => {
    it('should return open requests', async () => {
      const mockRequests = [{ id: 1 }, { id: 2 }];
      (requestService.getOpenRequests as jest.Mock).mockResolvedValue(mockRequests);

      await requestController.getOpen(mockReq as Request, mockRes as Response);

      expect(requestService.getOpenRequests).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(mockRequests);
    });

    it('should return 500 on error', async () => {
      (requestService.getOpenRequests as jest.Mock).mockRejectedValue(new Error('DB error'));

      await requestController.getOpen(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });

  describe('getForTeacher', () => {
    it('should return requests for a specific teacher', async () => {
      mockReq.params = { id: 'teacher123' };
      const mockRequests = [{ id: 1 }];
      (requestService.getRequestsForTeacher as jest.Mock).mockResolvedValue(mockRequests);

      await requestController.getForTeacher(mockReq as Request, mockRes as Response);

      expect(requestService.getRequestsForTeacher).toHaveBeenCalledWith('teacher123');
      expect(jsonMock).toHaveBeenCalledWith(mockRequests);
    });

    it('should return 500 on error', async () => {
      mockReq.params = { id: 'teacher123' };
      (requestService.getRequestsForTeacher as jest.Mock).mockRejectedValue(new Error('DB error'));

      await requestController.getForTeacher(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });

  describe('getByStudent', () => {
    it('should return requests by a specific student', async () => {
      mockReq.params = { id: 'student123' };
      const mockRequests = [{ id: 1 }];
      (requestService.getRequestsByStudent as jest.Mock).mockResolvedValue(mockRequests);

      await requestController.getByStudent(mockReq as Request, mockRes as Response);

      expect(requestService.getRequestsByStudent).toHaveBeenCalledWith('student123');
      expect(jsonMock).toHaveBeenCalledWith(mockRequests);
    });

    it('should return 500 on error', async () => {
      mockReq.params = { id: 'student123' };
      (requestService.getRequestsByStudent as jest.Mock).mockRejectedValue(new Error('DB error'));

      await requestController.getByStudent(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });

  describe('updateStatus', () => {
    it('should update the status to accepted', async () => {
      mockReq.params = { id: 'req123' };
      mockReq.body = { status: 'accepted' };

      await requestController.updateStatus(mockReq as Request, mockRes as Response);

      expect(requestService.updateRequestStatus).toHaveBeenCalledWith('req123', 'accepted', 'user123');
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Request accepted' });
    });

    it('should return 400 for invalid status', async () => {
      mockReq.params = { id: 'req123' };
      mockReq.body = { status: 'invalid_status' };

      await requestController.updateStatus(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid status. Use: accepted, declined, completed' });
      expect(requestService.updateRequestStatus).not.toHaveBeenCalled();
    });

    it('should return 500 on error', async () => {
      mockReq.params = { id: 'req123' };
      mockReq.body = { status: 'accepted' };
      (requestService.updateRequestStatus as jest.Mock).mockRejectedValue(new Error('DB error'));

      await requestController.updateStatus(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });
});
