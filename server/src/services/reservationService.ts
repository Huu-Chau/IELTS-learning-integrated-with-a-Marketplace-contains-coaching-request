import { Op } from 'sequelize';
import sequelize from '../config/database';
import Reservation from '../models/Reservation';
import { CancelReservationPayload, PayForReservationPayload, ReservationStatus } from '../types/reservation';
import User from '../models/User';
import MarketplaceRequest from '../models/MarketplaceRequest';
import TeacherListing from '../models/TeacherListing';
import TeacherAvailability from '../models/TeacherAvailability';
import { MarketplaceRequestStatus, MarketplaceRequestType } from '../types/marketplace-request';

export interface IReservationService {
    payForReservation(payload: PayForReservationPayload): Promise<MarketplaceRequest>;
    getReservationStatusByListing(listingId: number, studentId: string): Promise<any>;
    getReservationById(reservationId: number, studentId: string): Promise<any>;
    cancelReservation(payload: CancelReservationPayload): Promise<Reservation | null>;
}

export class ReservationService implements IReservationService {
    public async getReservationStatusByListing(listingId: number, studentId: string): Promise<any> {
        const activeReservation = await Reservation.findOne({
            where: {
                'listing.id': listingId,
                status: ReservationStatus.PENDING,
                expiresAt: { [Op.gt]: new Date() },
            },
        });

        if (!activeReservation) {
            return { status: 'available' };
        }

        const isOwn = activeReservation.studentId === studentId;
        return {
            status: ReservationStatus.PENDING,
            isOwn,
            expiresAt: activeReservation.expiresAt,
            reservationId: isOwn ? activeReservation.id : undefined,
            version: isOwn ? activeReservation.version : undefined,
        };
    }

    public async payForReservation(payload: PayForReservationPayload): Promise<MarketplaceRequest> {
        const { reservationId, studentId } = payload;

        const t = await sequelize.transaction();

        try {
            const reservation = await Reservation.findOne({
                where: {
                    id: reservationId,
                    studentId,
                    status: ReservationStatus.PENDING,
                    expiresAt: { [Op.gt]: new Date() },
                },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (!reservation) {
                throw new Error('Reservation not found or already completed');
            }

            const [studentUpdatedCount] = await User.update({
                wallet_balance: sequelize.literal(`wallet_balance - ${reservation.fee}`),
            }, {
                where: {
                    id: studentId,
                    wallet_balance: {
                        [Op.gte]: reservation.fee,
                    },
                },
                transaction: t,
            });

            if (studentUpdatedCount === 0) {
                throw new Error('Student not found or insufficient balance');
            }

            await reservation.update({
                status: ReservationStatus.COMPLETED,
            }, {
                transaction: t,
            });

            const listing = reservation.listing as TeacherListing;
            const marketplaceRequest = await MarketplaceRequest.create(
                {
                    studentId,
                    teacherId: listing.teacherId,
                    reservationId: reservation.id,
                    attemptId: null,
                    status: MarketplaceRequestStatus.ACCEPTED,
                    fee: reservation.fee,
                    skill: listing.skills?.[0] ?? null,
                    message: `Coaching session booked via marketplace reservation #${reservation.id}`,
                    feedbackPath: null,
                    requestType: MarketplaceRequestType.BOOKING,
                },
                { transaction: t }
            );

            await t.commit();
            return marketplaceRequest;
        } catch (error) {
            await t.rollback();
            console.error('[ReservationService] payForReservation error', error);
            throw error;
        }
    }

    public async getReservationById(reservationId: number, studentId: string): Promise<any> {
        const reservation = await Reservation.findOne({
            where: {
                id: reservationId,
                studentId,
            },
        });
        return reservation;
    }

    public async cancelReservation(payload: CancelReservationPayload): Promise<Reservation | null> {
        const { reservationId, studentId } = payload;
        const t = await sequelize.transaction();
        try {
            const reservation = await Reservation.findOne({
                where: {
                    id: reservationId,
                    studentId,
                    status: ReservationStatus.PENDING,
                    expiresAt: { [Op.gt]: new Date() },
                },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (!reservation) {
                await t.rollback();
                return null;
            }

            await reservation.update(
                { status: ReservationStatus.CANCELLED },
                { transaction: t },
            );

            await TeacherAvailability.update(
                { isAvailable: true },
                { where: { id: reservation.availabilityId }, transaction: t },
            );

            await t.commit();
            return reservation;
        } catch (error) {
            await t.rollback();
            console.error('[ReservationService] cancelReservation error', error);
            throw error;
        }
    }
}