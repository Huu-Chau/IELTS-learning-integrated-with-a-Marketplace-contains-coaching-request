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
import Notification from '../models/Notification';

const router = Router();
router.use(verifyToken());

interface NotificationItem {
    id: string;
    type: string;
    title: string;
    body: string;
    linkPath: string | null;
    isRead: boolean;
    createdAt: Date;
}

/**
 * GET /api/notifications
 * Returns the student's notifications sorted by date (newest first).
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    console.log('[NotificationRoutes] GET / called', { uid: req.user?.uid });
    try {
        const userId = req.user!.uid;

        const dbNotifications = await Notification.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit: 50,
        });

        const notifications: NotificationItem[] = dbNotifications.map(n => ({
            id: `db-${n.id}`,
            type: n.type,
            title: n.title,
            body: n.body,
            linkPath: n.linkPath,
            isRead: n.isRead,
            createdAt: n.createdAt,
        }));

        const unreadCount = notifications.filter((n) => !n.isRead).length;

        console.log('[NotificationRoutes] GET / success', {
            total: notifications.length,
            unread: unreadCount,
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('[NotificationRoutes] GET / error', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all real database notifications for the student as read.
 */
router.patch('/read-all', async (req: Request, res: Response): Promise<void> => {
    console.log('[NotificationRoutes] PATCH /read-all called', { uid: req.user?.uid });
    try {
        await Notification.update(
            { isRead: true },
            { where: { userId: req.user!.uid, isRead: false } }
        );
        console.log('[NotificationRoutes] PATCH /read-all success');
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('[NotificationRoutes] PATCH /read-all error', error);
        res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
});

export default router;
