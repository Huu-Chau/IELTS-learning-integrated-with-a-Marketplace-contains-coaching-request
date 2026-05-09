import { Request, Response, NextFunction } from 'express';
import { TeacherAvailabilityController } from '../teacherAvailabilityController';
import { ITeacherAvailabilityService } from '../../services/teacherAvailabilityService';
import {
  GetAvailabilityParams,
  CreateAvailabilityPayload,
  UpdateAvailabilityPayload,
  BookAvailabilityPayload,
  DeleteAvailabilityPayload,
} from '../../types/availability';

jest.mock('../../types/availability', () => ({
  GetAvailabilityParams: jest.fn().mockImplementation((teacherId, fromDate, toDate) => ({ teacherId, fromDate, toDate })),
  CreateAvailabilityPayload: jest.fn().mockImplementation((teacherId, date, startTime, endTime, timezone) => ({ teacherId, date, startTime, endTime, timezone })),
  UpdateAvailabilityPayload: jest.fn().mockImplementation((id, teacherId, date, startTime, endTime, timezone, isAvailable) => ({ id, teacherId, date, startTime, endTime, timezone, isAvailable })),
  BookAvailabilityPayload: jest.fn().mockImplementation((id, studentId, listingId) => ({ id, studentId, listingId })),
  DeleteAvailabilityPayload: jest.fn().mockImplementation((id, teacherId) => ({ id, teacherId })),
}));

describe('TeacherAvailabilityController', () => {
  let mockReq: Partial<Request> & { user?: any };
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let mockService: jest.Mocked<ITeacherAvailabilityService>;
  let controller: TeacherAvailabilityController;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {
      query: {},
      params: {},
      body: {},
      user: { uid: 'user123', email: 'test@test.com' } as any,
    };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn() as unknown as NextFunction;

    mockService = {
      getAvailability: jest.fn(),
      createAvailability: jest.fn(),
      updateAvailability: jest.fn(),
      bookAvailability: jest.fn(),
      deleteAvailability: jest.fn(),
    } as unknown as jest.Mocked<ITeacherAvailabilityService>;

    controller = new TeacherAvailabilityController(mockService);

    jest.clearAllMocks();
  });

  describe('getAvailability', () => {
    it('should parse query params and return availability', async () => {
      mockReq.query = { teacherId: 't1', from: '2026-05-01', to: '2026-05-31' };
      const mockResult = [{ id: 1 }];
      (mockService.getAvailability as jest.Mock).mockResolvedValue(mockResult);

      await controller.getAvailability(mockReq as Request, mockRes as Response, mockNext);

      expect(GetAvailabilityParams).toHaveBeenCalledWith('t1', new Date('2026-05-01'), new Date('2026-05-31'));
      expect(mockService.getAvailability).toHaveBeenCalledWith(expect.any(Object));
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle undefined from and to dates', async () => {
      mockReq.query = { teacherId: 't1' };
      (mockService.getAvailability as jest.Mock).mockResolvedValue([]);

      await controller.getAvailability(mockReq as Request, mockRes as Response, mockNext);

      expect(GetAvailabilityParams).toHaveBeenCalledWith('t1', undefined, undefined);
    });
  });

  describe('createAvailability', () => {
    it('should create availability and return 201', async () => {
      mockReq.body = { teacherId: 't1', date: '2026-05-01', startTime: '10:00', endTime: '11:00', timezone: 'UTC' };
      const mockResult = { id: 1 };
      (mockService.createAvailability as jest.Mock).mockResolvedValue(mockResult);

      await controller.createAvailability(mockReq as Request, mockRes as Response, mockNext);

      expect(CreateAvailabilityPayload).toHaveBeenCalledWith('t1', '2026-05-01', '10:00', '11:00', 'UTC');
      expect(mockService.createAvailability).toHaveBeenCalledWith(expect.any(Object));
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('updateAvailability', () => {
    it('should update availability and return success', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { teacherId: 't1', date: '2026-05-01', startTime: '10:00', endTime: '11:00', timezone: 'UTC', isAvailable: true };
      
      await controller.updateAvailability(mockReq as Request, mockRes as Response, mockNext);

      expect(UpdateAvailabilityPayload).toHaveBeenCalledWith(1, 't1', '2026-05-01', '10:00', '11:00', 'UTC', true);
      expect(mockService.updateAvailability).toHaveBeenCalledWith(expect.any(Object));
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('bookAvailability', () => {
    it('should book availability and return result', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { listingId: '100' };
      const mockResult = { id: 999 };
      (mockService.bookAvailability as jest.Mock).mockResolvedValue(mockResult);

      await controller.bookAvailability(mockReq as Request, mockRes as Response, mockNext);

      expect(BookAvailabilityPayload).toHaveBeenCalledWith(1, 'user123', 100);
      expect(mockService.bookAvailability).toHaveBeenCalledWith(expect.any(Object));
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('deleteAvailability', () => {
    it('should delete availability and return success', async () => {
      mockReq.params = { id: '1' };

      await controller.deleteAvailability(mockReq as Request, mockRes as Response, mockNext);

      expect(DeleteAvailabilityPayload).toHaveBeenCalledWith(1, 'user123');
      expect(mockService.deleteAvailability).toHaveBeenCalledWith(expect.any(Object));
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 409 if availability is not found or already booked', async () => {
      mockReq.params = { id: '1' };
      (mockService.deleteAvailability as jest.Mock).mockRejectedValue(new Error('Availability not found or already booked'));

      await controller.deleteAvailability(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Availability not found or already booked' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass other errors to next', async () => {
      mockReq.params = { id: '1' };
      const error = new Error('DB Error');
      (mockService.deleteAvailability as jest.Mock).mockRejectedValue(error);

      await controller.deleteAvailability(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
