import { Request, Response, NextFunction } from 'express';
import { ReservationController } from '../reservationController';
import { IReservationService } from '../../services/reservationService';
import { PayForReservationPayload } from '../../types/reservation';

jest.mock('../../types/reservation', () => {
  return {
    PayForReservationPayload: jest.fn().mockImplementation((reservationId, studentId) => ({
      reservationId,
      studentId,
    })),
  };
});

describe('ReservationController', () => {
  let mockReq: Partial<Request> & { user?: any };
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let mockReservationService: jest.Mocked<IReservationService>;
  let controller: ReservationController;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {
      params: {},
      user: { uid: 'student123', email: 'student@test.com' } as any,
    };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn() as unknown as NextFunction;

    mockReservationService = {
      payForReservation: jest.fn(),
    } as unknown as jest.Mocked<IReservationService>;

    controller = new ReservationController(mockReservationService);

    jest.clearAllMocks();
  });

  describe('payForReservation', () => {
    it('should successfully pay for a reservation', async () => {
      mockReq.params = { reservationId: '123' };
      
      const mockResult = { id: 999 };
      (mockReservationService.payForReservation as jest.Mock).mockResolvedValue(mockResult);

      await controller.payForReservation(mockReq as Request, mockRes as Response, mockNext);

      expect(PayForReservationPayload).toHaveBeenCalledWith(123, 'student123');
      expect(mockReservationService.payForReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          reservationId: 123,
          studentId: 'student123'
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        marketplaceRequestId: 999
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should propagate errors to the global error handler', async () => {
      mockReq.params = { reservationId: '123' };
      const error = new Error('Service error');
      (mockReservationService.payForReservation as jest.Mock).mockRejectedValue(error);

      // Since the controller doesn't catch the error internally, it should propagate.
      await expect(
        controller.payForReservation(mockReq as Request, mockRes as Response, mockNext)
      ).rejects.toThrow('Service error');

      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
