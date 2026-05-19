import { Request, Response, NextFunction } from 'express';
import { RequestController } from '../requestController';
import { IRequestService } from '../../services/requestService';
import { MarketplaceRequestStatus, UpdateRequestStatusPayload } from '../../types/marketplace-request';

describe('RequestController', () => {
  let requestController: RequestController;
  let mockRequestService: jest.Mocked<IRequestService>;
  let mockReq: Partial<Request> & { user?: any };
  let mockRes: Partial<Response>;
  let nextMock: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockRequestService = {
      getOpenRequests: jest.fn(),
      getRequestsForTeacher: jest.fn(),
      getRequestsByStudent: jest.fn(),
      updateRequestStatus: jest.fn(),
      createRequest: jest.fn(),
    };
    requestController = new RequestController(mockRequestService);

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    nextMock = jest.fn();
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
      mockRequestService.getOpenRequests.mockResolvedValue(mockRequests as any);

      await requestController.getOpen(mockReq as Request, mockRes as Response, nextMock);

      expect(mockRequestService.getOpenRequests).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(mockRequests);
      expect(nextMock).toHaveBeenCalled();
    });

    it('should call next with error on service failure', async () => {
      const error = new Error('DB error');
      mockRequestService.getOpenRequests.mockRejectedValue(error);

      await requestController.getOpen(mockReq as Request, mockRes as Response, nextMock);

      expect(nextMock).toHaveBeenCalledWith(error);
    });
  });

  describe('getForTeacher', () => {
    it('should return requests for a specific teacher', async () => {
      mockReq.params = { id: 'teacher123' };
      const mockRequests = [{ id: 1 }];
      mockRequestService.getRequestsForTeacher.mockResolvedValue(mockRequests as any);

      await requestController.getForTeacher(mockReq as Request, mockRes as Response, nextMock);

      expect(mockRequestService.getRequestsForTeacher).toHaveBeenCalledWith('teacher123');
      expect(jsonMock).toHaveBeenCalledWith(mockRequests);
      expect(nextMock).toHaveBeenCalled();
    });

    it('should call next with error on service failure', async () => {
      mockReq.params = { id: 'teacher123' };
      const error = new Error('DB error');
      mockRequestService.getRequestsForTeacher.mockRejectedValue(error);

      await requestController.getForTeacher(mockReq as Request, mockRes as Response, nextMock);

      expect(nextMock).toHaveBeenCalledWith(error);
    });
  });

  describe('getByStudent', () => {
    it('should return requests by a specific student', async () => {
      mockReq.params = { id: 'student123' };
      const mockRequests = [{ id: 1 }];
      mockRequestService.getRequestsByStudent.mockResolvedValue(mockRequests as any);

      await requestController.getByStudent(mockReq as Request, mockRes as Response, nextMock);

      expect(mockRequestService.getRequestsByStudent).toHaveBeenCalledWith('student123');
      expect(jsonMock).toHaveBeenCalledWith(mockRequests);
      expect(nextMock).toHaveBeenCalled();
    });

    it('should call next with error on service failure', async () => {
      mockReq.params = { id: 'student123' };
      const error = new Error('DB error');
      mockRequestService.getRequestsByStudent.mockRejectedValue(error);

      await requestController.getByStudent(mockReq as Request, mockRes as Response, nextMock);

      expect(nextMock).toHaveBeenCalledWith(error);
    });
  });

  describe('updateStatus', () => {
    it('should update the status to accepted', async () => {
      mockReq.params = { id: 'req123' };
      mockReq.body = { status: 'accepted' };

      await requestController.updateStatus(mockReq as Request, mockRes as Response, nextMock);

      expect(mockRequestService.updateRequestStatus).toHaveBeenCalledWith(new UpdateRequestStatusPayload('req123', MarketplaceRequestStatus.ACCEPTED, 'user123'));
      expect(jsonMock).toHaveBeenCalledWith({ message: `Request ${MarketplaceRequestStatus.ACCEPTED}` });
      expect(nextMock).toHaveBeenCalled();
    });

    it('should map declined to rejected', async () => {
      mockReq.params = { id: 'req123' };
      mockReq.body = { status: 'declined' };

      await requestController.updateStatus(mockReq as Request, mockRes as Response, nextMock);

      expect(mockRequestService.updateRequestStatus).toHaveBeenCalledWith(new UpdateRequestStatusPayload('req123', MarketplaceRequestStatus.REJECTED, 'user123'));
      expect(jsonMock).toHaveBeenCalledWith({ message: `Request ${MarketplaceRequestStatus.REJECTED}` });
      expect(nextMock).toHaveBeenCalled();
    });

    it('should return 400 for invalid status', async () => {
      mockReq.params = { id: 'req123' };
      mockReq.body = { status: 'invalid_status' };

      await requestController.updateStatus(mockReq as Request, mockRes as Response, nextMock);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: `Invalid status. Use: ${Object.values(MarketplaceRequestStatus).join(', ')}` });
      expect(mockRequestService.updateRequestStatus).not.toHaveBeenCalled();
    });

    it('should call next with error on service failure', async () => {
      mockReq.params = { id: 'req123' };
      mockReq.body = { status: 'accepted' };
      const error = new Error('DB error');
      mockRequestService.updateRequestStatus.mockRejectedValue(error);

      await requestController.updateStatus(mockReq as Request, mockRes as Response, nextMock);

      expect(nextMock).toHaveBeenCalledWith(error);
    });
  });
});
