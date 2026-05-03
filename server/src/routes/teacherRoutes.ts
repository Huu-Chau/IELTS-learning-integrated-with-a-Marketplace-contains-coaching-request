import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { verifyToken } from '../middleware/authMiddleware';
import TeacherListing from '../models/TeacherListing';
import Message from '../models/Message';
import Notification from '../models/Notification';
import MarketplaceRequest from '../models/MarketplaceRequest';
import User from '../models/User';
import TeacherAvailability from '../models/TeacherAvailability';
import { NotificationService } from '../services/notificationService';
import { CreateNotificationPayload, NotificationType } from '../types/notification';
import sequelize from '../config/database';
import { CreateMessagePayload } from '../types/message';
import { IMessageService, MessageService } from '../services/messageService';

const notificationService = new NotificationService();
const messageService: IMessageService = new MessageService();

const router = Router();

// ─── Middleware: all routes require a valid token ─────────────────────────────
router.use(verifyToken());

// =============================================================================
// DASHBOARD STATS
// =============================================================================

/**
 * GET /api/teacher/stats
 * Returns KPI metrics for the teacher dashboard overview.
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] GET /stats called', { uid: req.user?.uid });
    try {
        const teacherId = req.user!.uid;

        // Count pending orders
        const pendingOrders = await MarketplaceRequest.count({
            where: { teacherId, status: 'pending' },
        });

        // Count active students (unique students with accepted/completed requests)
        const activeRequests = await MarketplaceRequest.findAll({
            where: { teacherId, status: ['accepted', 'completed'] },
            attributes: ['studentId'],
        });
        const uniqueStudents = new Set(activeRequests.map((r) => r.studentId)).size;

        // Wallet balance from User record
        const teacher = await User.findByPk(teacherId);
        const walletBalance = Number(teacher?.wallet_balance ?? 0);

        // Unread notifications count
        const unreadNotifications = await Notification.count({
            where: { userId: teacherId, isRead: false },
        });

        // Unread messages count
        const unreadMessages = await Message.count({
            where: { receiverId: teacherId, isRead: false },
        });

        const stats = {
            monthlyEarnings: walletBalance,
            pendingOrders,
            activeStudents: uniqueStudents,
            avgRating: 4.8, // placeholder until a Reviews model exists
            unreadNotifications,
            unreadMessages,
        };

        console.log('[TeacherRoutes] GET /stats success', stats);
        res.json(stats);
    } catch (error) {
        console.error('[TeacherRoutes] GET /stats error', error);
        res.status(500).json({ error: 'Failed to fetch teacher stats' });
    }
});

// =============================================================================
// MARKETPLACE — LISTINGS
// =============================================================================

/**
 * GET /api/teacher/listings
 * Get all listings belonging to the authenticated teacher.
 */
router.get('/listings', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] GET /listings called', { uid: req.user?.uid });
    try {
        const listings = await TeacherListing.findAll({
            where: { teacherId: req.user!.uid },
            order: [['createdAt', 'DESC']],
        });
        console.log('[TeacherRoutes] GET /listings success', { count: listings.length });
        res.json(listings);
    } catch (error) {
        console.error('[TeacherRoutes] GET /listings error', error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});

/**
 * POST /api/teacher/listings
 * Create a new service listing.
 */
router.post('/listings', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] POST /listings called', { uid: req.user?.uid, body: req.body });
    try {
        const { title, description, skills, pricePerHour, sessionDuration } = req.body;

        if (!title || !description || !skills || !pricePerHour) {
            res.status(400).json({ error: 'title, description, skills, and pricePerHour are required' });
            return;
        }

        const listing = await TeacherListing.create({
            teacherId: req.user!.uid,
            title,
            description,
            skills: Array.isArray(skills) ? skills : [skills],
            pricePerHour: parseFloat(pricePerHour),
            sessionDuration: sessionDuration ?? 60,
        });

        console.log('[TeacherRoutes] POST /listings success', { id: listing.id });
        res.status(201).json(listing);
    } catch (error) {
        console.error('[TeacherRoutes] POST /listings error', error);
        res.status(500).json({ error: 'Failed to create listing' });
    }
});

/**
 * PATCH /api/teacher/listings/:id
 * Toggle active/inactive or update a listing.
 */
router.patch('/listings/:id', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] PATCH /listings/:id called', { id: req.params.id, uid: req.user?.uid });
    try {
        const listing = await TeacherListing.findOne({
            where: { id: req.params.id, teacherId: req.user!.uid },
        });

        if (!listing) {
            res.status(404).json({ error: 'Listing not found or access denied' });
            return;
        }

        await listing.update(req.body);
        console.log('[TeacherRoutes] PATCH /listings/:id success', { id: listing.id });
        res.json(listing);
    } catch (error) {
        console.error('[TeacherRoutes] PATCH /listings/:id error', error);
        res.status(500).json({ error: 'Failed to update listing' });
    }
});

/**
 * DELETE /api/teacher/listings/:id
 * Remove a listing.
 */
router.delete('/listings/:id', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] DELETE /listings/:id called', { id: req.params.id, uid: req.user?.uid });
    try {
        const deleted = await TeacherListing.destroy({
            where: { id: req.params.id, teacherId: req.user!.uid },
        });

        if (!deleted) {
            res.status(404).json({ error: 'Listing not found or access denied' });
            return;
        }

        console.log('[TeacherRoutes] DELETE /listings/:id success');
        res.json({ message: 'Listing deleted' });
    } catch (error) {
        console.error('[TeacherRoutes] DELETE /listings/:id error', error);
        res.status(500).json({ error: 'Failed to delete listing' });
    }
});

// =============================================================================
// AVAILABILITY SCHEDULE
// =============================================================================

/**
 * GET /api/teacher/availability
 * Returns the authenticated teacher's recurring weekly availability rules.
 */
router.get('/availability', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] GET /availability called', { uid: req.user?.uid });
    try {
        const teacherId = req.user!.uid;
        const rules = await TeacherAvailability.findAll({
            where: { teacherId },
            order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']],
        });
        console.log('[TeacherRoutes] GET /availability success', { count: rules.length });
        res.json(rules);
    } catch (error) {
        console.error('[TeacherRoutes] GET /availability error', error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

/**
 * PUT /api/teacher/availability
 * Replaces the teacher's entire weekly schedule.
 * Body: { rules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }] }
 */
router.put('/availability', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] PUT /availability called', { uid: req.user?.uid, body: req.body });
    try {
        const teacherId = req.user!.uid;
        const { rules } = req.body as { rules: { dayOfWeek: number; startTime: string; endTime: string }[] };

        if (!Array.isArray(rules)) {
            res.status(400).json({ error: 'rules must be an array' });
            return;
        }

        // Replace all existing rules atomically
        await TeacherAvailability.destroy({ where: { teacherId } });

        if (rules.length > 0) {
            await TeacherAvailability.bulkCreate(
                rules.map((r) => ({ teacherId, dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime, isAvailable: true }))
            );
        }

        const updated = await TeacherAvailability.findAll({
            where: { teacherId },
            order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']],
        });

        console.log('[TeacherRoutes] PUT /availability success', { count: updated.length });
        res.json(updated);
    } catch (error) {
        console.error('[TeacherRoutes] PUT /availability error', error);
        res.status(500).json({ error: 'Failed to update availability' });
    }
});

// =============================================================================
// MARKETPLACE — ORDERS (incoming student requests)
// =============================================================================

/**
 * GET /api/teacher/orders
 * Get all marketplace orders directed at this teacher.
 */
router.get('/orders', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] GET /orders called', { uid: req.user?.uid });
    try {
        const orders = await MarketplaceRequest.findAll({
            where: { teacherId: req.user!.uid },
            order: [['createdAt', 'DESC']],
        });

        // Enrich each order with the student's display name
        const enriched = await Promise.all(
            orders.map(async (order) => {
                const student = await User.findByPk(order.studentId, {
                    attributes: ['firstName', 'lastName', 'email'],
                });
                return {
                    id: order.id,
                    studentId: order.studentId,
                    studentName: student
                        ? `${student.firstName} ${student.lastName}`.trim()
                        : order.studentId.slice(0, 8),
                    status: order.status,
                    fee: Number(order.fee ?? 0),
                    skill: order.skill,
                    message: order.message,
                    // scheduledAt: order.scheduledAt,
                    // durationMinutes: order.durationMinutes,
                    createdAt: order.createdAt,
                    updatedAt: order.updatedAt,
                };
            })
        );

        console.log('[TeacherRoutes] GET /orders success', { count: enriched.length });
        res.json(enriched);
    } catch (error) {
        console.error('[TeacherRoutes] GET /orders error', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

/**
 * PATCH /api/teacher/orders/:id
 * Accept or decline an order. Body: { status: 'accepted' | 'rejected' }
 */
router.patch('/orders/:id', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] PATCH /orders/:id called', { id: req.params.id, body: req.body });
    try {
        const order = await MarketplaceRequest.findOne({
            where: { id: req.params.id, teacherId: req.user!.uid },
        });

        if (!order) {
            res.status(404).json({ error: 'Order not found or access denied' });
            return;
        }

        const { status, feedbackPath } = req.body;
        await order.update({ status, feedbackPath });

        console.log('[TeacherRoutes] PATCH /orders/:id success', { id: order.id, status });
        res.json(order);
    } catch (error) {
        console.error('[TeacherRoutes] PATCH /orders/:id error', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// =============================================================================
// PAYMENTS & WALLET
// =============================================================================

/**
 * GET /api/teacher/transactions
 * Returns wallet balance and transaction history from completed marketplace requests.
 */
router.get('/transactions', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] GET /transactions called', { uid: req.user?.uid });
    try {
        const teacherId = req.user!.uid;
        const teacher = await User.findByPk(teacherId);

        const completedRequests = await MarketplaceRequest.findAll({
            where: { teacherId, status: ['accepted', 'completed'] },
            order: [['updatedAt', 'DESC']],
        });

        // Enrich each transaction with the student's display name
        const transactions = await Promise.all(
            completedRequests.map(async (r) => {
                const student = await User.findByPk(r.studentId, {
                    attributes: ['firstName', 'lastName'],
                });
                return {
                    id: r.id,
                    studentId: r.studentId,
                    studentName: student
                        ? `${student.firstName} ${student.lastName}`.trim()
                        : r.studentId.slice(0, 8),
                    date: r.updatedAt,
                    service: r.skill ? `IELTS ${r.skill} Review` : 'IELTS Review',
                    amount: Number(r.fee ?? 0),
                    status: r.status === 'completed' ? 'Cleared' : 'Pending',
                };
            })
        );

        console.log('[TeacherRoutes] GET /transactions success', { count: transactions.length });
        res.json({
            walletBalance: Number(teacher?.wallet_balance ?? 0),
            transactions,
        });
    } catch (error) {
        console.error('[TeacherRoutes] GET /transactions error', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

/**
 * POST /api/teacher/withdraw
 * Simulate a withdrawal request. Deducts from wallet_balance and records a notification.
 * Body: { amount: number }
 */
router.post('/withdraw', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] POST /withdraw called', { uid: req.user?.uid, body: req.body });
    const teacherId = req.user!.uid;
    const { amount } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        res.status(400).json({ error: 'A valid positive amount is required' });
        return;
    }
    const t = await sequelize.transaction();

    try {
        const teacher = await User.findByPk(teacherId, { lock: t.LOCK.UPDATE, transaction: t });
        if (!teacher) {
            await t.rollback();
            res.status(404).json({ error: 'Teacher not found' });
            return;
        }

        const currentBalance = Number(teacher.wallet_balance ?? 0);
        const withdrawAmount = Number(amount);

        if (withdrawAmount > currentBalance) {
            await t.rollback();
            res.status(400).json({ error: 'Withdrawal amount exceeds wallet balance' });
            return;
        }

        // Deduct from wallet
        await teacher.update({ wallet_balance: currentBalance - withdrawAmount }, { transaction: t });

        // Create a system notification for the teacher
        // TODO: Will change to Event Driven to create notification 
        const payload = new CreateNotificationPayload(
            teacherId,
            NotificationType.PAYMENT,
            'Withdrawal Requested',
            `Your withdrawal of ${withdrawAmount.toLocaleString('vi-VN')} Brain Credits has been submitted. Processing takes 1–3 business days.`,
            '/teacher/payments',
        );
        await notificationService.createNotification(payload);

        await t.commit();

        console.log('[TeacherRoutes] POST /withdraw success', { newBalance: currentBalance - withdrawAmount });
        res.json({ success: true, newBalance: currentBalance - withdrawAmount });
    } catch (error) {
        await t.rollback();
        console.error('[TeacherRoutes] POST /withdraw error', error);
        res.status(500).json({ error: 'Failed to process withdrawal' });
    }
});

// =============================================================================
// MESSENGER
// =============================================================================

/**
 * GET /api/teacher/conversations
 */
router.get('/conversations', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] GET /conversations called', { uid: req.user?.uid });
    try {
        const teacherId = req.user!.uid;

        const messages = await Message.findAll({
            where: {
                [Op.or]: [{ senderId: teacherId }, { receiverId: teacherId }],
            },
            order: [['sentAt', 'DESC']],
        });

        const convMap = new Map<string, {
            conversationId: string;
            otherId: string;
            lastMessage: string;
            lastAt: Date;
            unreadCount: number;
        }>();

        for (const msg of messages) {
            const otherId = msg.senderId === teacherId ? msg.receiverId : msg.senderId;
            if (!convMap.has(msg.conversationId)) {
                const unreadCount = messages.filter(
                    (m) => m.conversationId === msg.conversationId && m.receiverId === teacherId && !m.isRead
                ).length;
                convMap.set(msg.conversationId, {
                    conversationId: msg.conversationId,
                    otherId,
                    lastMessage: msg.content,
                    lastAt: msg.sentAt!,
                    unreadCount,
                });
            }
        }

        // TODO: Find by ids instead of findByPk in a loop
        const conversations = await Promise.all(
            Array.from(convMap.values()).map(async (conv) => {
                const otherUser = await User.findByPk(conv.otherId, {
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                });
                return {
                    ...conv,
                    otherUser: otherUser
                        ? { id: otherUser.id, name: `${otherUser.firstName} ${otherUser.lastName}`, email: otherUser.email }
                        : { id: conv.otherId, name: 'Unknown', email: '' },
                };
            })
        );

        conversations.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

        console.log('[TeacherRoutes] GET /conversations success', { count: conversations.length });
        res.json(conversations);
    } catch (error) {
        console.error('[TeacherRoutes] GET /conversations error', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

/**
 * GET /api/teacher/messages/:conversationId
 */
router.get('/messages/:conversationId', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] GET /messages/:conversationId called', { id: req.params.conversationId });
    try {
        const teacherId = req.user!.uid;
        const { conversationId } = req.params;

        const messages = await Message.findAll({
            where: { conversationId },
            order: [['sentAt', 'ASC']],
        });

        await Message.update(
            { isRead: true },
            { where: { conversationId, receiverId: teacherId, isRead: false } }
        );

        console.log('[TeacherRoutes] GET /messages/:conversationId success', { count: messages.length });
        res.json(messages);
    } catch (error) {
        console.error('[TeacherRoutes] GET /messages/:conversationId error', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

/**
 * POST /api/teacher/messages/:receiverId
 */
router.post('/messages/:receiverId', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] POST /messages/:receiverId called', { receiverId: req.params.receiverId });
    try {
        const senderId = req.user!.uid;
        const { receiverId } = req.params;
        const { content, type = 'text' } = req.body;

        if (!content) {
            res.status(400).json({ error: 'content is required' });
            return;
        }

        const conversationId = MessageService.buildConversationId(senderId, receiverId);

        const payload = new CreateMessagePayload(
            conversationId,
            senderId,
            receiverId,
            content,
            type,
        );
        const message = await messageService.createMessage(payload);

        // Emit new message event to the receiver's room, and the sender's room
        const io = req.app.get('io');
        if (io) {
            io.to(receiverId).emit('new_message', message);
            io.to(senderId).emit('new_message', message);
        }

        console.log('[TeacherRoutes] POST /messages/:receiverId success', { id: message.id });
        res.status(201).json(message);
    } catch (error) {
        console.error('[TeacherRoutes] POST /messages/:receiverId error', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// =============================================================================
// NOTIFICATIONS
// =============================================================================

router.get('/notifications', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] GET /notifications called', { uid: req.user?.uid });
    try {
        const notifications = await Notification.findAll({
            where: { userId: req.user!.uid },
            order: [['createdAt', 'DESC']],
            limit: 50,
        });
        console.log('[TeacherRoutes] GET /notifications success', { count: notifications.length });
        res.json(notifications);
    } catch (error) {
        console.error('[TeacherRoutes] GET /notifications error', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

router.patch('/notifications/read-all', async (req: Request, res: Response): Promise<void> => {
    console.log('[TeacherRoutes] PATCH /notifications/read-all called', { uid: req.user?.uid });
    try {
        await Notification.update(
            { isRead: true },
            { where: { userId: req.user!.uid, isRead: false } }
        );
        console.log('[TeacherRoutes] PATCH /notifications/read-all success');
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('[TeacherRoutes] PATCH /notifications/read-all error', error);
        res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
});

export default router;
