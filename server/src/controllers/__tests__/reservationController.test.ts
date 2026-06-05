import { Request, Response, NextFunction } from 'express';
import { ReservationController } from '../reservationController';
import { IReservationService } from '../../services/reservationService';
import { CancelReservationPayload, PayForReservationPayload } from '../../types/reservation';

jest.mock('../../types/reservation', () => {
  return {
    PayForReservationPayload: jest.fn().mockImplementation((reservationId, studentId) => ({
      reservationId,
      studentId,
    })),
    CancelReservationPayload: jest.fn().mockImplementation((reservationId, studentId) => ({
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
      getReservationStatusByListing: jest.fn(),
      getReservationById: jest.fn(),
      cancelReservation: jest.fn(),
      expireStaleReservations: jest.fn(),
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

    it('should call next(error) if service throws', async () => {
      mockReq.params = { reservationId: '123' };
      const error = new Error('Service error');
      (mockReservationService.payForReservation as jest.Mock).mockRejectedValue(error);

      await controller.payForReservation(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getReservationStatusByListing', () => {
    it('should successfully get reservation status', async () => {
      mockReq.params = { listingId: '456' };

      const mockResult = { status: 'available' };
      (mockReservationService.getReservationStatusByListing as jest.Mock).mockResolvedValue(mockResult);

      await controller.getReservationStatusByListing(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReservationService.getReservationStatusByListing).toHaveBeenCalledWith(456, 'student123');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next(error) if service throws', async () => {
      mockReq.params = { listingId: '456' };
      const error = new Error('Service error');
      (mockReservationService.getReservationStatusByListing as jest.Mock).mockRejectedValue(error);

      await controller.getReservationStatusByListing(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('cancelReservation', () => {
    it('should return 200 {success:true} and call next when service resolves a reservation', async () => {
      mockReq.params = { reservationId: '7' };
      const mockReservation = { id: 7, status: 'cancelled' };
      (mockReservationService.cancelReservation as jest.Mock).mockResolvedValue(mockReservation);

      await controller.cancelReservation(mockReq as Request, mockRes as Response, mockNext);

      expect(CancelReservationPayload).toHaveBeenCalledWith(7, 'student123');
      expect(mockReservationService.cancelReservation).toHaveBeenCalledWith(
        expect.objectContaining({ reservationId: 7, studentId: 'student123' }),
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 404 with message and call next when service resolves null', async () => {
      mockReq.params = { reservationId: '7' };
      (mockReservationService.cancelReservation as jest.Mock).mockResolvedValue(null);

      await controller.cancelReservation(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Reservation not found or not cancellable' });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next(error) when service rejects', async () => {
      mockReq.params = { reservationId: '7' };
      const error = new Error('Service failure');
      (mockReservationService.cancelReservation as jest.Mock).mockRejectedValue(error);

      await controller.cancelReservation(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
