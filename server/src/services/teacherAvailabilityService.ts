import { Op } from 'sequelize';
import sequelize from '../config/database';
import Reservation from '../models/Reservation';
import TeacherAvailability from '../models/TeacherAvailability';
import TeacherListing from '../models/TeacherListing';
import { BookAvailabilityPayload, CreateAvailabilityPayload, DeleteAvailabilityPayload, UpdateAvailabilityPayload } from '../types/availability';
import { GetAvailabilityParams } from '../types/availability/get-availability.params';

export interface ITeacherAvailabilityService {
    createAvailability(payload: CreateAvailabilityPayload): Promise<TeacherAvailability>;
    updateAvailability(payload: UpdateAvailabilityPayload): Promise<void>;
    bookAvailability(payload: BookAvailabilityPayload): Promise<Reservation>;
    getAvailability(params: GetAvailabilityParams): Promise<TeacherAvailability[]>;
    deleteAvailability(payload: DeleteAvailabilityPayload): Promise<void>;
}

export class TeacherAvailabilityService implements ITeacherAvailabilityService {
    public async createAvailability(payload: CreateAvailabilityPayload): Promise<TeacherAvailability> {
        const { teacherId, date, startTime, endTime, timezone } = payload;
        const availability = await TeacherAvailability.create({
            teacherId,
            date,
            startTime,
            endTime,
            timezone,
            isAvailable: true,
        });
        return availability;
    }

    public async updateAvailability(payload: UpdateAvailabilityPayload): Promise<void> {
        const { id, teacherId, date, startTime, endTime, timezone, isAvailable } = payload;

        const availability = await TeacherAvailability.findOne({ where: { id, teacherId } });
        if (!availability) {
            throw new Error('Availability not found');
        }

        await availability.update({
            date,
            startTime,
            endTime,
            timezone,
            isAvailable,
        });
        return;
    }

    public async bookAvailability(payload: BookAvailabilityPayload): Promise<Reservation> {
        const { availabilityId, studentId, listingId } = payload;

        const t = await sequelize.transaction();

        try {
            // lock listing to prevent race condition when teacher update price
            const listing = await TeacherListing.findOne({
                where: { id: listingId, isActive: true },
                lock: t.LOCK.UPDATE
            });

            if (!listing) {
                throw new Error('Listing not found');
            }

            // Cross-teacher validation: Ensure slot belongs to the listing's teacher
            const availability = await TeacherAvailability.findOne({
                where: { id: availabilityId },
                transaction: t
            });
            if (!availability) {
                throw new Error('Availability not found');
            }
            if (availability.teacherId !== listing.teacherId) {
                throw new Error('Availability does not belong to this listing');
            }

            // lock availability to prevent race condition when student book same slot
            const [updatedCount] = await TeacherAvailability.update({
                isAvailable: false,
            }, {
                where: { id: availabilityId, isAvailable: true },
                transaction: t
            });

            if (updatedCount === 0) {
                // The slot is already marked isAvailable: false. Let's see who owns the lock.
                const existingReservation = await Reservation.findOne({
                    where: { availabilityId, status: 'pending' },
                    transaction: t
                });

                if (existingReservation) {
                    if (existingReservation.studentId === studentId && existingReservation.expiresAt > new Date()) {
                        // RESUME BOOKING: The current student owns the lock and it is still valid.
                        await t.commit();
                        return existingReservation;
                    }
                    
                    if (existingReservation.expiresAt <= new Date()) {
                        // GHOST LOCK CLEANUP: The reservation expired but the cron job hasn't cleaned it up yet.
                        // We can steal this slot and give it to the new student.
                        await existingReservation.update({ status: 'expired' }, { transaction: t });
                        // Proceed to create a new reservation below
                    } else {
                        throw new Error('Availability already booked by another student');
                    }
                } else {
                    throw new Error('Availability not found or already booked');
                }
            }

            // create reservation with 5 minutes expiration time
            const reservation = await Reservation.create({
                availabilityId,
                listing: listing.toJSON(),
                studentId,
                status: 'pending',
                fee: listing.pricePerHour,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            }, { transaction: t });

            await t.commit();
            return reservation;
        } catch (error) {
            await t.rollback();
            console.error('[ReservationRoutes] POST /:reservationId/pay error', error);
            throw error;
        }
    }

    public async getAvailability(params: GetAvailabilityParams): Promise<TeacherAvailability[]> {
        const { teacherId, from, to } = params;

        const condition: any = { teacherId };
        if (from && to) {
            condition.date = {
                [Op.between]: [from, to],
            };
        }

        const availabilities = await TeacherAvailability.findAll({
            where: condition,
        });
        return availabilities;
    }

    public async deleteAvailability(payload: DeleteAvailabilityPayload): Promise<void> {
        const { id, teacherId } = payload;
        const deletedCount = await TeacherAvailability.destroy({
            where: {
                id,
                teacherId,
                isAvailable: true,
            }
        });

        if (deletedCount === 0) {
            throw new Error('Availability not found or already booked');
        }
    }
}