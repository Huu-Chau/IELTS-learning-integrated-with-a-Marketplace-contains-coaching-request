import { ReservationService } from '../reservationService';
import sequelize from '../../config/database';
import Reservation from '../../models/Reservation';
import User from '../../models/User';
import MarketplaceRequest from '../../models/MarketplaceRequest';
import { MarketplaceRequestStatus, MarketplaceRequestType } from '../../types/marketplace-request';
import { ReservationStatus } from '../../types/reservation';

jest.mock('../../config/database', () => ({
    transaction: jest.fn(),
    literal: jest.fn((val) => val),
}));

jest.mock('../../models/Reservation', () => ({
    findOne: jest.fn(),
}));

jest.mock('../../models/User', () => ({
    update: jest.fn(),
}));

jest.mock('../../models/MarketplaceRequest', () => ({
    create: jest.fn(),
}));

describe('ReservationService', () => {
    let reservationService: ReservationService;
    let mockTransaction: any;

    beforeEach(() => {
        reservationService = new ReservationService();
        mockTransaction = {
            commit: jest.fn(),
            rollback: jest.fn(),
            LOCK: { UPDATE: 'UPDATE' },
        };
        (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
        jest.clearAllMocks();
    });

    describe('payForReservation', () => {
        const payload = {
            reservationId: 1,
            studentId: '101',
        };

        const mockReservation = {
            id: 1,
            studentId: '101',
            fee: 50,
            status: ReservationStatus.PENDING,
            listing: {
                teacherId: '201',
                skills: ['IELTS Writing'],
            },
            update: jest.fn().mockResolvedValue([1]),
        };

        it('should successfully complete a reservation and create a marketplace request', async () => {
            (Reservation.findOne as jest.Mock).mockResolvedValue(mockReservation);
            (User.update as jest.Mock).mockResolvedValue([1]);
            (MarketplaceRequest.create as jest.Mock).mockResolvedValue({ id: 501, ...payload });

            const result = await reservationService.payForReservation(payload);

            expect(sequelize.transaction).toHaveBeenCalled();
            expect(Reservation.findOne).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    id: payload.reservationId,
                    studentId: payload.studentId,
                    status: ReservationStatus.PENDING,
                }),
                transaction: mockTransaction,
                lock: mockTransaction.LOCK.UPDATE,
            }));
            expect(User.update).toHaveBeenCalledWith(
                { wallet_balance: expect.stringContaining('wallet_balance - 50') },
                expect.objectContaining({
                    where: expect.objectContaining({
                        id: payload.studentId,
                    }),
                    transaction: mockTransaction,
                })
            );
            expect(mockReservation.update).toHaveBeenCalledWith(
                { status: ReservationStatus.COMPLETED },
                { transaction: mockTransaction }
            );
            expect(MarketplaceRequest.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    studentId: payload.studentId,
                    teacherId: '201',
                    reservationId: 1,
                    status: MarketplaceRequestStatus.ACCEPTED,
                    fee: 50,
                    skill: 'IELTS Writing',
                    requestType: MarketplaceRequestType.BOOKING,
                }),
                { transaction: mockTransaction }
            );
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.id).toBe(501);
        });

        it('should throw error if reservation is not found', async () => {
            (Reservation.findOne as jest.Mock).mockResolvedValue(null);

            await expect(reservationService.payForReservation(payload))
                .rejects.toThrow('Reservation not found or already completed');

            expect(mockTransaction.rollback).toHaveBeenCalled();
            expect(mockTransaction.commit).not.toHaveBeenCalled();
        });

        it('should throw error if user wallet update fails (insufficient balance or user not found)', async () => {
            (Reservation.findOne as jest.Mock).mockResolvedValue(mockReservation);
            (User.update as jest.Mock).mockResolvedValue([0]);

            await expect(reservationService.payForReservation(payload))
                .rejects.toThrow('Student not found or insufficient balance');

            expect(mockTransaction.rollback).toHaveBeenCalled();
            expect(mockTransaction.commit).not.toHaveBeenCalled();
        });

        it('should handle errors and rollback transaction', async () => {
            (Reservation.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(reservationService.payForReservation(payload))
                .rejects.toThrow('DB Error');

            expect(mockTransaction.rollback).toHaveBeenCalled();
        });
    });

    describe('getReservationStatusByListing', () => {
        const listingId = 456;
        const studentId = 'student123';

        it('should return available status if no reservation exists', async () => {
            (Reservation.findOne as jest.Mock).mockResolvedValue(null);

            const result = await reservationService.getReservationStatusByListing(listingId, studentId);

            expect(result).toEqual({ status: 'available' });
            expect(Reservation.findOne).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    'listing.id': listingId,
                    status: ReservationStatus.PENDING,
                }),
            }));
        });

        it('should return pending status and isOwn true if own reservation exists', async () => {
            const mockReservation = {
                id: 123,
                studentId,
                expiresAt: new Date(Date.now() + 300000),
                version: 1,
            };
            (Reservation.findOne as jest.Mock).mockResolvedValue(mockReservation);

            const result = await reservationService.getReservationStatusByListing(listingId, studentId);

            expect(result).toEqual({
                status: ReservationStatus.PENDING,
                isOwn: true,
                expiresAt: mockReservation.expiresAt,
                reservationId: 123,
                version: 1,
            });
        });

        it('should return pending status and isOwn false if another student has reservation', async () => {
            const mockReservation = {
                id: 123,
                studentId: 'otherStudent',
                expiresAt: new Date(Date.now() + 300000),
                version: 1,
            };
            (Reservation.findOne as jest.Mock).mockResolvedValue(mockReservation);

            const result = await reservationService.getReservationStatusByListing(listingId, studentId);

            expect(result).toEqual({
                status: ReservationStatus.PENDING,
                isOwn: false,
                expiresAt: mockReservation.expiresAt,
                reservationId: undefined,
                version: undefined,
            });
        });
    });
});
