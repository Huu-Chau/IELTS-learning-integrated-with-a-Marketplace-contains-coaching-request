/**
 * notificationRoutes.ts
 *
 * GET /api/notifications
 * Returns a merged, time-sorted list of student activity notifications
 * derived from Attempts and MarketplaceRequests tables.
 * No separate Notifications table is written to — this is computed on-demand.
 */
import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import Attempt from '../models/Attempt';
import MarketplaceRequest from '../models/MarketplaceRequest';
import User from '../models/User';

const router = Router();
router.use(verifyToken());

interface NotificationItem {
    id: string;
    type: 'attempt' | 'marketplace';
    title: string;
    body: string;
    linkPath: string;
    isRead: boolean;
    createdAt: Date;
}

/**
 * GET /api/notifications
 * Aggregates the student's last 20 attempts + marketplace requests
 * into a unified notification feed, sorted by date (newest first).
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    console.log('[NotificationRoutes] GET / called', { uid: req.user?.uid });
    try {
        const userId = req.user!.uid;

        // ── 1. Fetch recent attempts ────────────────────────────────────────
        const attempts = await Attempt.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit: 10,
        });

        const attemptNotifications: NotificationItem[] = attempts.map((attempt) => {
            const typeLabel = attempt.type.charAt(0).toUpperCase() + attempt.type.slice(1);
            const scoreStr = attempt.score ? ` · Band ${attempt.score.toFixed(1)}` : '';
            return {
                id: `attempt-${attempt.id}`,
                type: 'attempt',
                title: `${typeLabel} Test Completed${scoreStr}`,
                body: `Your ${attempt.type} mock test result has been saved to your progress.`,
                linkPath: '/progress',
                isRead: false,
                createdAt: attempt.createdAt,
            };
        });

        // ── 2. Fetch marketplace requests ──────────────────────────────────
        const requests = await MarketplaceRequest.findAll({
            where: { studentId: userId },
            order: [['updatedAt', 'DESC']],
            limit: 10,
        });

        const marketplaceNotifications: NotificationItem[] = await Promise.all(
            requests.map(async (mr) => {
                const teacher = mr.teacherId
                    ? await User.findByPk(mr.teacherId, {
                          attributes: ['firstName', 'lastName'],
                      })
                    : null;

                const teacherName = teacher
                    ? `${teacher.firstName} ${teacher.lastName}`.trim()
                    : 'a teacher';

                const statusMessages: Record<string, { title: string; body: string }> = {
                    pending: {
                        title: 'Review Request Pending',
                        body: `Your expert review request is waiting. We'll notify you when ${teacherName} responds.`,
                    },
                    accepted: {
                        title: '🎉 Request Accepted!',
                        body: `${teacherName} has accepted your review request. Check your requests page.`,
                    },
                    completed: {
                        title: '✅ Review Completed',
                        body: `${teacherName} has completed your IELTS review. Your feedback is ready!`,
                    },
                    rejected: {
                        title: 'Request Declined',
                        body: `${teacherName} was unable to accept your request. Try another tutor.`,
                    },
                };

                const msg = statusMessages[mr.status] || {
                    title: 'Marketplace Update',
                    body: `Your request status changed to: ${mr.status}`,
                };

                return {
                    id: `marketplace-${mr.id}`,
                    type: 'marketplace' as const,
                    title: msg.title,
                    body: msg.body,
                    linkPath: '/my-requests',
                    isRead: mr.status === 'pending',  // Mark older statuses as "read"
                    createdAt: mr.updatedAt,           // Use updatedAt so status changes surface first
                };
            })
        );

        // ── 3. Merge, sort, limit ──────────────────────────────────────────
        const allNotifications = [...attemptNotifications, ...marketplaceNotifications]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 20);

        const unreadCount = allNotifications.filter((n) => !n.isRead).length;

        console.log('[NotificationRoutes] GET / success', {
            total: allNotifications.length,
            unread: unreadCount,
        });

        res.json({ notifications: allNotifications, unreadCount });
    } catch (error) {
        console.error('[NotificationRoutes] GET / error', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

export default router;
