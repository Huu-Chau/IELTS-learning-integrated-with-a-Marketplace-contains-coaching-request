import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import { notificationController } from '../container';

const router = Router();
router.use(verifyToken());

/**
 * GET /api/notifications
 * Returns the student's notifications sorted by date (newest first).
 */
router.get('/', (req, res, next) => notificationController.getNotifications(req, res, next));

/**
 * PATCH /api/notifications/read-all
 * Mark all real database notifications for the student as read.
 */
router.patch('/read-all', (req, res, next) => notificationController.markAllAsRead(req, res, next));

export default router;
