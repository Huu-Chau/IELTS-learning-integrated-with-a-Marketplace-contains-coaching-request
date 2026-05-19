import { Request, Response, NextFunction } from 'express';
import { MarketplaceController } from '../marketplaceController';
import { IMarketplaceService } from '../../services/marketplaceService';
import { ITeacherAvailabilityService } from '../../services/teacherAvailabilityService';
import { BrowseListingsQuery, CreateBookingPayload } from '../../types/marketplace';
import { GetAvailabilityParams } from '../../types/availability/get-availability.params';

describe('MarketplaceController', () => {
    let controller: MarketplaceController;
    let mockMarketplaceService: jest.Mocked<IMarketplaceService>;
    let mockAvailabilityService: jest.Mocked<ITeacherAvailabilityService>;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockReq = {
            params: {},
            query: {},
            body: {},
            user: { uid: 'student-123' } as any
        };
        mockRes = {
            status: statusMock,
            json: jsonMock,
        } as any;
        mockNext = jest.fn();

        mockMarketplaceService = {
            getListings: jest.fn(),
            getListingById: jest.fn(),
            createBooking: jest.fn(),
            getStudentRequests: jest.fn(),
            getStudentPayments: jest.fn(),
            getTeacherRequests: jest.fn(),
            getTeacherTransactions: jest.fn(),
            updateBookingStatus: jest.fn(),
            getListingByTeacherId: jest.fn(),
            createOrUpdateListing: jest.fn()
        } as any;

        mockAvailabilityService = {
            getAvailability: jest.fn(),
            createAvailability: jest.fn(),
            updateAvailability: jest.fn(),
            deleteAvailability: jest.fn()
        } as any;

        controller = new MarketplaceController(mockMarketplaceService, mockAvailabilityService);
        jest.clearAllMocks();
    });

    describe('getListings', () => {
        it('should return listings and call next()', async () => {
            const mockListings = [{ id: 1, title: 'IELTS Coaching' }];
            mockReq.query = { skill: 'writing', maxPrice: '50', search: 'pro' };
            mockMarketplaceService.getListings.mockResolvedValue(mockListings as any);

            await controller.getListings(mockReq as Request, mockRes as Response, mockNext);

            expect(mockMarketplaceService.getListings).toHaveBeenCalledWith(
                expect.any(BrowseListingsQuery),
                'student-123'
            );
            expect(jsonMock).toHaveBeenCalledWith(mockListings);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle service errors', async () => {
            const error = new Error('Service failure');
            mockMarketplaceService.getListings.mockRejectedValue(error);

            await controller.getListings(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getListingById', () => {
        it('should return a listing if found', async () => {
            const mockListing = { id: 1, title: 'IELTS Coaching' };
            mockReq.params = { id: '1' };
            mockMarketplaceService.getListingById.mockResolvedValue(mockListing as any);

            await controller.getListingById(mockReq as Request, mockRes as Response, mockNext);

            expect(mockMarketplaceService.getListingById).toHaveBeenCalledWith('1');
            expect(jsonMock).toHaveBeenCalledWith(mockListing);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 404 if listing not found', async () => {
            mockReq.params = { id: '999' };
            mockMarketplaceService.getListingById.mockResolvedValue(null);

            await controller.getListingById(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Listing not found' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle errors via next(error)', async () => {
            const error = new Error('DB Error');
            mockReq.params = { id: '1' };
            mockMarketplaceService.getListingById.mockRejectedValue(error);

            await controller.getListingById(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('createBooking', () => {
        it('should create a booking and return 201', async () => {
            const mockResult = { id: 100, status: 'pending' };
            mockReq.body = { listingId: 1, teacherId: 'teacher-123', message: 'Hello', attemptId: 50 };
            mockMarketplaceService.createBooking.mockResolvedValue(mockResult as any);

            await controller.createBooking(mockReq as Request, mockRes as Response, mockNext);

            expect(mockMarketplaceService.createBooking).toHaveBeenCalledWith(expect.any(CreateBookingPayload));
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith(mockResult);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 400 if listingId or teacherId is missing', async () => {
            mockReq.body = { message: 'Hello' };

            await controller.createBooking(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'listingId and teacherId are required' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 400 if user already has a pending request', async () => {
            const error = new Error('You already have a pending request for this listing');
            mockReq.body = { listingId: 1, teacherId: 'teacher-123' };
            mockMarketplaceService.createBooking.mockRejectedValue(error);

            await controller.createBooking(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: error.message });
        });

        it('should return 404 if listing is not found during booking', async () => {
            const error = new Error('Listing not found');
            mockReq.body = { listingId: 999, teacherId: 'teacher-123' };
            mockMarketplaceService.createBooking.mockRejectedValue(error);

            await controller.createBooking(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: error.message });
        });

        it('should handle generic errors via next(error)', async () => {
            const error = new Error('Internal Server Error');
            mockReq.body = { listingId: 1, teacherId: 'teacher-123' };
            mockMarketplaceService.createBooking.mockRejectedValue(error);

            await controller.createBooking(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getStudentRequests', () => {
        it('should return student requests', async () => {
            const mockRequests = [{ id: 1, status: 'pending' }];
            mockMarketplaceService.getStudentRequests.mockResolvedValue(mockRequests as any);

            await controller.getStudentRequests(mockReq as Request, mockRes as Response, mockNext);

            expect(mockMarketplaceService.getStudentRequests).toHaveBeenCalledWith('student-123');
            expect(jsonMock).toHaveBeenCalledWith(mockRequests);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            const error = new Error('Service error');
            mockMarketplaceService.getStudentRequests.mockRejectedValue(error);

            await controller.getStudentRequests(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getStudentPayments', () => {
        it('should return student payments', async () => {
            const mockPayments = [{ id: 1, amount: 50 }];
            mockMarketplaceService.getStudentPayments.mockResolvedValue(mockPayments as any);

            await controller.getStudentPayments(mockReq as Request, mockRes as Response, mockNext);

            expect(mockMarketplaceService.getStudentPayments).toHaveBeenCalledWith('student-123');
            expect(jsonMock).toHaveBeenCalledWith(mockPayments);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            const error = new Error('Service error');
            mockMarketplaceService.getStudentPayments.mockRejectedValue(error);

            await controller.getStudentPayments(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getTeacherAvailability', () => {
        it('should return teacher availability slots', async () => {
            const mockSlots = [{ start: new Date(), end: new Date() }];
            mockReq.params = { uid: 'teacher-123' };
            mockAvailabilityService.getAvailability.mockResolvedValue(mockSlots as any);

            await controller.getTeacherAvailability(mockReq as Request, mockRes as Response, mockNext);

            expect(mockAvailabilityService.getAvailability).toHaveBeenCalledWith(expect.any(GetAvailabilityParams));
            expect(jsonMock).toHaveBeenCalledWith({ slots: mockSlots });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            const error = new Error('Availability service error');
            mockReq.params = { uid: 'teacher-123' };
            mockAvailabilityService.getAvailability.mockRejectedValue(error);

            await controller.getTeacherAvailability(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
