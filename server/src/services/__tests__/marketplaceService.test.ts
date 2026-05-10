// Mock models before importing MarketplaceService
jest.mock('../../models/TeacherListing', () => ({
    findAll: jest.fn(),
    findOne: jest.fn(),
}));
jest.mock('../../models/MarketplaceRequest', () => ({
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
}));
jest.mock('../../models/User', () => ({
    findByPk: jest.fn(),
}));
jest.mock('../../models/Reservation', () => ({
    findOne: jest.fn(),
}));

import { Op } from 'sequelize';
import { MarketplaceService } from '../marketplaceService';
import TeacherListing from '../../models/TeacherListing';
import MarketplaceRequest from '../../models/MarketplaceRequest';
import User from '../../models/User';
import Reservation from '../../models/Reservation';
import { BrowseListingsQuery, CreateBookingPayload } from '../../types/marketplace';
import { MarketplaceRequestStatus } from '../../types/marketplace-request';

describe('MarketplaceService', () => {
    let marketplaceService: MarketplaceService;

    beforeEach(() => {
        marketplaceService = new MarketplaceService();
        jest.clearAllMocks();
    });

    describe('getListings', () => {
        it('should fetch enriched listings with filters', async () => {
            const mockListings = [
                {
                    id: 1,
                    teacherId: 'teacher1',
                    title: 'Speaking Session',
                    description: 'IELTS Speaking',
                    skills: ['Speaking'],
                    pricePerHour: 25,
                    sessionDuration: 60,
                    isActive: true,
                    createdAt: new Date(),
                }
            ];

            (TeacherListing.findAll as jest.Mock).mockResolvedValue(mockListings);
            (User.findByPk as jest.Mock).mockResolvedValue({
                id: 'teacher1',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com'
            });
            (Reservation.findOne as jest.Mock)
                .mockResolvedValueOnce(null) // activeReservation
                .mockResolvedValueOnce(null); // completedBooking

            const query = new BrowseListingsQuery('Speaking', 30, 'Speaking');
            const result = await marketplaceService.getListings(query, 'student1');

            expect(TeacherListing.findAll).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    isActive: true,
                    skills: { [Op.contains]: ['Speaking'] },
                    pricePerHour: { [Op.lte]: 30 },
                    [Op.or]: expect.any(Array)
                })
            }));
            expect(result).toHaveLength(1);
            expect(result[0].teacher.name).toBe('John Doe');
            expect(result[0].reservationStatus).toBe('available');
        });

        it('should show pending status if listing has an active reservation', async () => {
            const mockListings = [{ id: 1, teacherId: 't1', pricePerHour: 20 }];
            (TeacherListing.findAll as jest.Mock).mockResolvedValue(mockListings);
            (User.findByPk as jest.Mock).mockResolvedValue({ firstName: 'T', lastName: '1' });
            
            // Mock active reservation
            (Reservation.findOne as jest.Mock)
                .mockResolvedValueOnce({ studentId: 'student1', expiresAt: new Date() }) // activeReservation
                .mockResolvedValueOnce(null); // completedBooking

            const result = await marketplaceService.getListings(new BrowseListingsQuery(), 'student1');
            expect(result[0].reservationStatus).toBe('pending');
            expect(result[0].isOwnReservation).toBe(true);
        });

        it('should show booked status if listing has a completed booking', async () => {
            const mockListings = [{ id: 1, teacherId: 't1', pricePerHour: 20 }];
            (TeacherListing.findAll as jest.Mock).mockResolvedValue(mockListings);
            (User.findByPk as jest.Mock).mockResolvedValue({ firstName: 'T', lastName: '1' });
            
            // Mock completed booking
            (Reservation.findOne as jest.Mock)
                .mockResolvedValueOnce(null) // activeReservation
                .mockResolvedValueOnce({ id: 'res1', status: 'completed' }); // completedBooking

            const result = await marketplaceService.getListings(new BrowseListingsQuery());
            expect(result[0].reservationStatus).toBe('booked');
        });
    });

    describe('getListingById', () => {
        it('should return enriched listing by ID', async () => {
            const mockListing = { id: 1, teacherId: 't1', pricePerHour: 20, isActive: true };
            (TeacherListing.findOne as jest.Mock).mockResolvedValue(mockListing);
            (User.findByPk as jest.Mock).mockResolvedValue({ firstName: 'John', lastName: 'Doe' });

            const result = await marketplaceService.getListingById('1');

            expect(result.id).toBe(1);
            expect(result.teacher.name).toBe('John Doe');
        });

        it('should return null if listing not found', async () => {
            (TeacherListing.findOne as jest.Mock).mockResolvedValue(null);
            const result = await marketplaceService.getListingById('99');
            expect(result).toBeNull();
        });
    });

    describe('createBooking', () => {
        it('should create a new marketplace request successfully', async () => {
            const payload = new CreateBookingPayload(1, 'teacher1', 'Help me', 123);
            
            (MarketplaceRequest.findOne as jest.Mock).mockResolvedValue(null); // No duplicate
            (TeacherListing.findOne as jest.Mock).mockResolvedValue({
                id: 1,
                teacherId: 'teacher1',
                isActive: true,
                pricePerHour: 25,
                skills: ['Writing']
            });
            (MarketplaceRequest.create as jest.Mock).mockResolvedValue({
                id: 101,
                studentId: 'student1',
                teacherId: 'teacher1',
                fee: 25,
                toJSON: () => ({ id: 101, studentId: 'student1', teacherId: 'teacher1', fee: 25 })
            });

            const result = await marketplaceService.createBooking('student1', payload);

            expect(MarketplaceRequest.create).toHaveBeenCalledWith(expect.objectContaining({
                studentId: 'student1',
                teacherId: 'teacher1',
                fee: 25
            }));
            expect(result.serviceLabel).toBe('IELTS Writing Review');
        });

        it('should throw error if duplicate pending request exists', async () => {
            (MarketplaceRequest.findOne as jest.Mock).mockResolvedValue({ id: 1 });
            const payload = new CreateBookingPayload(1, 't1');
            
            await expect(marketplaceService.createBooking('s1', payload))
                .rejects.toThrow('already have a pending request');
        });

        it('should throw error if listing is not found or inactive', async () => {
            (MarketplaceRequest.findOne as jest.Mock).mockResolvedValue(null);
            (TeacherListing.findOne as jest.Mock).mockResolvedValue(null);
            const payload = new CreateBookingPayload(1, 't1');

            await expect(marketplaceService.createBooking('s1', payload))
                .rejects.toThrow('Listing not found or is no longer active');
        });
    });

    describe('getStudentRequests', () => {
        it('should return enriched requests for a student', async () => {
            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue([
                { id: 1, teacherId: 't1', status: 'pending', fee: 20 }
            ]);
            (User.findByPk as jest.Mock).mockResolvedValue({ firstName: 'John', lastName: 'Doe' });

            const result = await marketplaceService.getStudentRequests('s1');

            expect(result).toHaveLength(1);
            expect(result[0].teacherName).toBe('John Doe');
        });
    });

    describe('getStudentPayments', () => {
        it('should calculate total spent and return payment history', async () => {
            (User.findByPk as jest.Mock)
                .mockResolvedValueOnce({ wallet_balance: 100 }) // Student
                .mockResolvedValue({ firstName: 'Teacher', lastName: 'One' }); // Teacher for each request

            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue([
                { id: 1, teacherId: 't1', status: 'completed', fee: 20, skill: 'Writing' },
                { id: 2, teacherId: 't1', status: 'accepted', fee: 15, skill: 'Speaking' },
                { id: 3, teacherId: 't1', status: 'pending', fee: 10 }
            ]);

            const result = await marketplaceService.getStudentPayments('s1');

            expect(result.walletBalance).toBe(100);
            expect(result.totalSpent).toBe(35); // 20 + 15
            expect(result.payments).toHaveLength(3);
            expect(result.payments[0].status).toBe('Paid');
            expect(result.payments[1].status).toBe('Processing');
        });
    });
});
