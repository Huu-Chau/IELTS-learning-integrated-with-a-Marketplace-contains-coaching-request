import cron from 'node-cron';
import { Op } from 'sequelize';
import MarketplaceRequest from '../models/MarketplaceRequest';
import User from '../models/User';
import sequelize from '../config/database';
import Reservation from '../models/Reservation';
import TeacherAvailability from '../models/TeacherAvailability';
import { NotificationService } from '../services/notificationService';
import { CreateNotificationPayload, NotificationType } from '../types/notification';
import { MarketplaceRequestStatus } from '../types/marketplace-request';

const notificationService = new NotificationService();
// ─────────────────────────────────────────────────────────────────────────────
// TASK 1: Auto-Complete Sessions & Release Funds (runs daily at 02:00 AM)
// Finds accepted bookings whose scheduledAt is more than 24 hours in the past
// and moves them to 'completed', crediting the teacher's wallet.
// ─────────────────────────────────────────────────────────────────────────────
async function autoCompleteSessions() {
    console.log('[CronService] autoCompleteSessions called');
    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago

        const cutoffStr = cutoff.toISOString();

        const overdueRequests = await MarketplaceRequest.findAll({
            where: {
                status: 'accepted',
                [Op.and]: sequelize.literal(`("Reservation->TeacherAvailability"."date"::text || 'T' || "Reservation->TeacherAvailability"."endTime" || ':00+07:00')::timestamptz < '${cutoffStr}'`)
            },
            include: [
                {
                    model: Reservation,
                    required: true,
                    include: [{
                        model: TeacherAvailability,
                        required: true
                    }]
                }
            ]
        });

        if (overdueRequests.length === 0) {
            console.log('[CronService] autoCompleteSessions: no sessions to auto-complete');
            return;
        }

        for (const req of overdueRequests) {
            const teacherId = req.teacherId;
            if (!teacherId) {
                console.warn('[CronService] autoCompleteSessions: request missing teacherId', { id: req.id });
                continue;
            }

            await sequelize.transaction(async (t) => {
                // Mark request as completed
                await req.update({ status: MarketplaceRequestStatus.COMPLETED }, { transaction: t });

                // Credit teacher's wallet
                const teacher = await User.findByPk(teacherId, { transaction: t });
                if (teacher) {
                    await teacher.increment('wallet_balance', { by: Number(req.fee), transaction: t });
                }

                // Notify teacher
                const teacherPayload = new CreateNotificationPayload(
                    teacherId,
                    NotificationType.PAYMENT,
                    '💸 Session Completed & Funds Released!',
                    `Your session has been auto-completed. ${Number(req.fee)} 🧠 has been added to your wallet balance.`,
                    '/teacher/payments',
                );

                // Notify student
                const studentPayload = new CreateNotificationPayload(
                    req.studentId,
                    NotificationType.ORDER,
                    '✅ Session Marked Complete',
                    `Your coaching session has been marked as complete. We hope it was helpful!`,
                    '/my-requests',
                );
                await Promise.all([
                    notificationService.createNotification(teacherPayload),
                    notificationService.createNotification(studentPayload)
                ]);
            });

            console.log('[CronService] autoCompleteSessions: completed request', { id: req.id });
        }

        console.log('[CronService] autoCompleteSessions success', { count: overdueRequests.length });
    } catch (error) {
        console.error('[CronService] autoCompleteSessions error', error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK 2: Auto-Reject Stale Pending Requests (runs daily at 03:00 AM)
// If a teacher ignores a pending request for > 48h, auto-reject and refund.
// ─────────────────────────────────────────────────────────────────────────────
async function autoRejectStaleRequests() {
    console.log('[CronService] autoRejectStaleRequests called');
    try {
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h ago

        const staleRequests = await MarketplaceRequest.findAll({
            where: {
                status: 'pending',
                [Op.or]: [
                    { createdAt: { [Op.lt]: cutoff } },
                    sequelize.literal(`("Reservation->TeacherAvailability"."date"::text || 'T' || "Reservation->TeacherAvailability"."startTime" || ':00+07:00')::timestamptz < NOW()`)
                ]
            },
            include: [
                {
                    model: Reservation,
                    required: true,
                    include: [{
                        model: TeacherAvailability,
                        required: true
                    }]
                }
            ]
        });

        if (staleRequests.length === 0) {
            console.log('[CronService] autoRejectStaleRequests: no stale requests found');
            return;
        }

        for (const req of staleRequests) {
            await sequelize.transaction(async (t) => {
                // Reject the request
                await req.update({ status: MarketplaceRequestStatus.REJECTED }, { transaction: t });

                // Refund the student's wallet
                const student = await User.findByPk(req.studentId, { transaction: t });
                if (student) {
                    await student.increment('wallet_balance', { by: Number(req.fee), transaction: t });
                }

                // Notify student
                const payload = new CreateNotificationPayload(
                    req.studentId,
                    NotificationType.ORDER,
                    '🔄 Booking Auto-Cancelled & Refunded',
                    `Your tutor did not respond within 48 hours. ${Number(req.fee)} 🧠 has been refunded to your wallet.`,
                    '/payments',
                );
                await notificationService.createNotification(payload);
            });

            console.log('[CronService] autoRejectStaleRequests: rejected request', { id: req.id });
        }

        console.log('[CronService] autoRejectStaleRequests success', { count: staleRequests.length });
    } catch (error) {
        console.error('[CronService] autoRejectStaleRequests error', error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK 3: Session Reminders — 24h before (runs every hour at :00)
// Finds accepted sessions starting in the next 1 hour window (23h-24h out)
// and sends reminder notifications to both parties.
// ─────────────────────────────────────────────────────────────────────────────
async function sendSessionReminders() {
    console.log('[CronService] sendSessionReminders called');
    try {
        const now = new Date();
        const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const in23hStr = in23h.toISOString();
        const in24hStr = in24h.toISOString();

        const upcomingSessions = await MarketplaceRequest.findAll({
            where: {
                status: 'accepted',
                [Op.and]: sequelize.literal(`("Reservation->TeacherAvailability"."date"::text || 'T' || "Reservation->TeacherAvailability"."startTime" || ':00+07:00')::timestamptz BETWEEN '${in23hStr}' AND '${in24hStr}'`)
            },
            include: [
                {
                    model: Reservation,
                    required: true,
                    include: [{
                        model: TeacherAvailability,
                        required: true
                    }]
                }
            ]
        });

        if (upcomingSessions.length === 0) {
            console.log('[CronService] sendSessionReminders: no sessions found');
            return;
        }

        for (const req of upcomingSessions) {
            // TODO: Will change to Event Driven to create notification
            const promises = [];
            // Notify student
            const studentPayload = new CreateNotificationPayload(
                req.studentId,
                NotificationType.ORDER,
                '⏰ Session Reminder — Tomorrow!',
                `Your coaching session starts in approximately 24 hours. Make sure you're prepared!`,
                '/my-requests',
            );
            promises.push(notificationService.createNotification(studentPayload));

            // Notify teacher
            if (req.teacherId) {
                const teacherPayload = new CreateNotificationPayload(
                    req.teacherId,
                    NotificationType.ORDER,
                    '⏰ Upcoming Session Tomorrow',
                    `You have a coaching session scheduled in approximately 24 hours. Please be ready!`,
                    '/teacher/marketplace',
                );
                promises.push(notificationService.createNotification(teacherPayload));
            }

            await Promise.all(promises);
        }

        console.log('[CronService] sendSessionReminders success', { count: upcomingSessions.length });
    } catch (error) {
        console.error('[CronService] sendSessionReminders error', error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK 4: Expire Abandoned Reservations (runs every minute)
// Finds reservations that are pending and have passed their expiresAt time,
// marks them as expired, and frees up the teacher availability slot.
// ─────────────────────────────────────────────────────────────────────────────
async function expireReservations() {
    console.log('[CronService] expireReservations called');
    try {
        await sequelize.transaction(async (t) => {
            const expiredReservations = await Reservation.findAll({
                where: {
                    status: 'pending',
                    expiresAt: { [Op.lt]: new Date() },
                },
                transaction: t,
                lock: true,
                skipLocked: true
            });

            if (expiredReservations.length === 0) {
                return; // Nothing to expire
            }

            for (const reservation of expiredReservations) {
                // Mark reservation as expired
                await reservation.update({ status: 'expired' }, { transaction: t });

                // Free up the availability slot
                await TeacherAvailability.update(
                    { isAvailable: true },
                    { where: { id: reservation.availabilityId }, transaction: t }
                );

                console.log('[CronService] expireReservations: expired reservation', { id: reservation.id });
            }

            console.log('[CronService] expireReservations success', { count: expiredReservations.length });
        });
    } catch (error) {
        console.error('[CronService] expireReservations error', error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: Start all cron jobs
// ─────────────────────────────────────────────────────────────────────────────
export function startAllJobs() {
    console.log('[CronService] startAllJobs called — initializing all background tasks');

    // Daily at 02:00 AM — auto-complete sessions & release funds
    cron.schedule('0 2 * * *', autoCompleteSessions, {
        timezone: 'Asia/Ho_Chi_Minh',
    });

    // Daily at 03:00 AM — auto-reject stale requests & refund students
    cron.schedule('0 3 * * *', autoRejectStaleRequests, {
        timezone: 'Asia/Ho_Chi_Minh',
    });

    // Every hour at :00 — send 24h session reminders
    cron.schedule('0 * * * *', sendSessionReminders, {
        timezone: 'Asia/Ho_Chi_Minh',
    });

    // Every minute — expire abandoned reservations
    cron.schedule('* * * * *', expireReservations, {
        timezone: 'Asia/Ho_Chi_Minh',
    });

    console.log('[CronService] startAllJobs success — 4 jobs registered');
}

// Export for manual testing via scripts
export { autoCompleteSessions, autoRejectStaleRequests, sendSessionReminders, expireReservations };
