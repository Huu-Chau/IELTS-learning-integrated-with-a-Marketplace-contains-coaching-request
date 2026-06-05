import { ReservationService } from '../reservationService';
import sequelize from '../../config/database';
import Reservation from '../../models/Reservation';
import User from '../../models/User';
import MarketplaceRequest from '../../models/MarketplaceRequest';
import TeacherAvailability from '../../models/TeacherAvailability';
import { MarketplaceRequestStatus, MarketplaceRequestType } from '../../types/marketplace-request';
import { ReservationStatus, CancelReservationPayload } from '../../types/reservation';

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

jest.mock('../../models/TeacherAvailability', () => ({
    update: jest.fn(),
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

    describe('cancelReservation', () => {
        const payload = new CancelReservationPayload(1, 'student-uid-1');

        const mockReservation = {
            id: 1,
            studentId: 'student-uid-1',
            availabilityId: 42,
            status: ReservationStatus.PENDING,
            update: jest.fn().mockResolvedValue(undefined),
        };

        beforeEach(() => {
            mockReservation.update = jest.fn().mockResolvedValue(undefined);
            (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
        });

        it('should update status to CANCELLED and commit on success', async () => {
            (Reservation.findOne as jest.Mock).mockResolvedValue(mockReservation);
            (TeacherAvailability.update as jest.Mock).mockResolvedValue([1]);

            const result = await reservationService.cancelReservation(payload);

            expect(Reservation.findOne).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    id: payload.reservationId,
                    studentId: payload.studentId,
                    status: ReservationStatus.PENDING,
                }),
                transaction: mockTransaction,
                lock: mockTransaction.LOCK.UPDATE,
            }));
            expect(mockReservation.update).toHaveBeenCalledWith(
                { status: ReservationStatus.CANCELLED },
                { transaction: mockTransaction },
            );
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(mockTransaction.rollback).not.toHaveBeenCalled();
            expect(result).toBe(mockReservation);
        });

        it('should free the teacher availability slot on successful cancel', async () => {
            const commitOrder: string[] = [];
            (Reservation.findOne as jest.Mock).mockResolvedValue(mockReservation);
            (TeacherAvailability.update as jest.Mock).mockResolvedValue([1]);
            mockTransaction.commit.mockImplementation(() => {
                commitOrder.push('commit');
                return Promise.resolve();
            });
            (TeacherAvailability.update as jest.Mock).mockImplementation(() => {
                commitOrder.push('availability.update');
                return Promise.resolve([1]);
            });

            await reservationService.cancelReservation(payload);

            expect(TeacherAvailability.update).toHaveBeenCalledWith(
                { isAvailable: true },
                { where: { id: mockReservation.availabilityId }, transaction: mockTransaction },
            );
            // availability.update must happen before commit
            expect(commitOrder.indexOf('availability.update')).toBeLessThan(commitOrder.indexOf('commit'));
        });

        it('should rollback and return null when reservation is not found', async () => {
            (Reservation.findOne as jest.Mock).mockResolvedValue(null);

            const result = await reservationService.cancelReservation(payload);

            expect(result).toBeNull();
            expect(mockTransaction.rollback).toHaveBeenCalled();
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(mockReservation.update).not.toHaveBeenCalled();
            expect(TeacherAvailability.update).not.toHaveBeenCalled();
        });

        it('should NOT call User.update in any path (no wallet mutation)', async () => {
            // success path
            (Reservation.findOne as jest.Mock).mockResolvedValue(mockReservation);
            (TeacherAvailability.update as jest.Mock).mockResolvedValue([1]);
            await reservationService.cancelReservation(payload);
            expect(User.update).not.toHaveBeenCalled();

            jest.clearAllMocks();
            (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);

            // not-found path
            (Reservation.findOne as jest.Mock).mockResolvedValue(null);
            await reservationService.cancelReservation(payload);
            expect(User.update).not.toHaveBeenCalled();
        });

        it('should rollback and rethrow when update throws', async () => {
            const dbError = new Error('DB update error');
            (Reservation.findOne as jest.Mock).mockResolvedValue(mockReservation);
            mockReservation.update = jest.fn().mockRejectedValue(dbError);

            await expect(reservationService.cancelReservation(payload)).rejects.toThrow('DB update error');

            expect(mockTransaction.rollback).toHaveBeenCalled();
            expect(mockTransaction.commit).not.toHaveBeenCalled();
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
