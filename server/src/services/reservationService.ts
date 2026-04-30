import { Op } from 'sequelize';
import sequelize from '../config/database';
import Reservation from '../models/Reservation';
import { PayForReservationPayload } from '../types/reservation';
import User from '../models/User';
import MarketplaceRequest from '../models/MarketplaceRequest';
import TeacherListing from '../models/TeacherListing';

export interface IReservationService {
    payForReservation(payload: PayForReservationPayload): Promise<MarketplaceRequest>;
}

export class ReservationService implements IReservationService {
    public async payForReservation(payload: PayForReservationPayload): Promise<MarketplaceRequest> {
        const { reservationId, studentId } = payload;

        const t = await sequelize.transaction();

        try {
            const reservation = await Reservation.findOne({
                where: {
                    id: reservationId,
                    studentId,
                    status: 'pending',
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
                throw new Error('Student not found');
            }

            await reservation.update({
                status: 'completed',
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
                    status: 'accepted',
                    fee: reservation.fee,
                    skill: listing.skills?.[0] ?? null,
                    message: `Coaching session booked via marketplace reservation #${reservation.id}`,
                    feedbackPath: null,
                    requestType: 'booking',
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
}