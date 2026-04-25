import cron from 'node-cron';
import { Op } from 'sequelize';
import MarketplaceRequest from '../models/MarketplaceRequest';
import User from '../models/User';
import Notification from '../models/Notification';
import sequelize from '../config/database';

// ─────────────────────────────────────────────────────────────────────────────
// TASK 1: Auto-Complete Sessions & Release Funds (runs daily at 02:00 AM)
// Finds accepted bookings whose scheduledAt is more than 24 hours in the past
// and moves them to 'completed', crediting the teacher's wallet.
// ─────────────────────────────────────────────────────────────────────────────
async function autoCompleteSessions() {
    console.log('[CronService] autoCompleteSessions called');
    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago

        const overdueRequests = await MarketplaceRequest.findAll({
            where: {
                status: 'accepted',
                scheduledAt: { [Op.lt]: cutoff },
            },
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
                await req.update({ status: 'completed' }, { transaction: t });

                // Credit teacher's wallet
                const teacher = await User.findByPk(teacherId, { transaction: t });
                if (teacher) {
                    await teacher.increment('wallet_balance', { by: Number(req.fee), transaction: t });
                }

                // Notify teacher
                await Notification.create({
                    userId: teacherId,
                    type: 'payment',
                    title: '💸 Session Completed & Funds Released!',
                    body: `Your session has been auto-completed. ${Number(req.fee)} 🧠 has been added to your wallet balance.`,
                    linkPath: '/teacher/payments',
                    isRead: false,
                }, { transaction: t });

                // Notify student
                await Notification.create({
                    userId: req.studentId,
                    type: 'order',
                    title: '✅ Session Marked Complete',
                    body: `Your coaching session has been marked as complete. We hope it was helpful!`,
                    linkPath: '/my-requests',
                    isRead: false,
                }, { transaction: t });
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
                createdAt: { [Op.lt]: cutoff },
            },
        });

        if (staleRequests.length === 0) {
            console.log('[CronService] autoRejectStaleRequests: no stale requests found');
            return;
        }

        for (const req of staleRequests) {
            await sequelize.transaction(async (t) => {
                // Reject the request
                await req.update({ status: 'rejected' }, { transaction: t });

                // Refund the student's wallet
                const student = await User.findByPk(req.studentId, { transaction: t });
                if (student) {
                    await student.increment('wallet_balance', { by: Number(req.fee), transaction: t });
                }

                // Notify student
                await Notification.create({
                    userId: req.studentId,
                    type: 'order',
                    title: '🔄 Booking Auto-Cancelled & Refunded',
                    body: `Your tutor did not respond within 48 hours. ${Number(req.fee)} 🧠 has been refunded to your wallet.`,
                    linkPath: '/payments',
                    isRead: false,
                }, { transaction: t });
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

        const upcomingSessions = await MarketplaceRequest.findAll({
            where: {
                status: 'accepted',
                scheduledAt: { [Op.between]: [in23h, in24h] },
            },
        });

        if (upcomingSessions.length === 0) {
            console.log('[CronService] sendSessionReminders: no upcoming sessions');
            return;
        }

        for (const req of upcomingSessions) {
            // Notify student
            await Notification.create({
                userId: req.studentId,
                type: 'order',
                title: '⏰ Session Reminder — Tomorrow!',
                body: `Your coaching session starts in approximately 24 hours. Make sure you're prepared!`,
                linkPath: '/my-requests',
                isRead: false,
            });

            // Notify teacher
            if (req.teacherId) {
                await Notification.create({
                    userId: req.teacherId,
                    type: 'order',
                    title: '⏰ Upcoming Session Tomorrow',
                    body: `You have a coaching session scheduled in approximately 24 hours. Please be ready!`,
                    linkPath: '/teacher/marketplace',
                    isRead: false,
                });
            }
        }

        console.log('[CronService] sendSessionReminders success', { count: upcomingSessions.length });
    } catch (error) {
        console.error('[CronService] sendSessionReminders error', error);
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

    console.log('[CronService] startAllJobs success — 3 jobs registered');
}

// Export for manual testing via scripts
export { autoCompleteSessions, autoRejectStaleRequests, sendSessionReminders };
