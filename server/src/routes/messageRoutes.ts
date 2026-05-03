import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { verifyToken } from '../middleware/authMiddleware';
import Message from '../models/Message';
import User from '../models/User';
import { IMessageService, MessageService } from '../services/messageService';
import { CreateMessagePayload } from '../types/message';

const router = Router();
const messageService: IMessageService = new MessageService();

// ─── All routes require authentication ────────────────────────────────────────
router.use(verifyToken());

/**
 * GET /api/messages/conversations
 * Returns all conversations for the authenticated user (student OR teacher).
 * Each conversation shows the last message, the other participant, and unread count.
 */
router.get('/conversations', async (req: Request, res: Response): Promise<void> => {
    console.log('[MessageRoutes] GET /conversations called', { uid: req.user?.uid });
    try {
        const userId = req.user!.uid;

        const messages = await Message.findAll({
            where: {
                [Op.or]: [{ senderId: userId }, { receiverId: userId }],
            },
            order: [['sentAt', 'DESC']],
        });

        // Group by conversationId, pick last message per conversation
        const convMap = new Map<string, {
            conversationId: string;
            otherId: string;
            lastMessage: string;
            lastAt: Date;
            unreadCount: number;
        }>();

        for (const msg of messages) {
            const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
            if (!convMap.has(msg.conversationId)) {
                const unreadCount = messages.filter(
                    (m) => m.conversationId === msg.conversationId && m.receiverId === userId && !m.isRead
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

        // Enrich with user display names
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

        // Sort by newest message
        conversations.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

        console.log('[MessageRoutes] GET /conversations success', { count: conversations.length });
        res.json(conversations);
    } catch (error) {
        console.error('[MessageRoutes] GET /conversations error', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

/**
 * GET /api/messages/:conversationId
 * Returns all messages in a specific conversation.
 * Also marks all received messages as read.
 */
router.get('/:conversationId', async (req: Request, res: Response): Promise<void> => {
    console.log('[MessageRoutes] GET /:conversationId called', { id: req.params.conversationId });
    try {
        const userId = req.user!.uid;
        const { conversationId } = req.params;

        const messages = await Message.findAll({
            where: { conversationId },
            order: [['sentAt', 'ASC']],
        });

        // Mark received messages as read
        await Message.update(
            { isRead: true },
            { where: { conversationId, receiverId: userId, isRead: false } }
        );

        console.log('[MessageRoutes] GET /:conversationId success', { count: messages.length });
        res.json(messages);
    } catch (error) {
        console.error('[MessageRoutes] GET /:conversationId error', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

/**
 * POST /api/messages/send/:receiverId
 * Send a message to another user. Body: { content, type? }
 * Works for both students messaging teachers and vice versa.
 * TODO: Will change to SocketIO for sending message
 */
router.post('/send/:receiverId', async (req: Request, res: Response): Promise<void> => {
    console.log('[MessageRoutes] POST /send/:receiverId called', { receiverId: req.params.receiverId });
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

        console.log('[MessageRoutes] POST /send/:receiverId success', { id: message.id });
        res.status(201).json(message);
    } catch (error) {
        console.error('[MessageRoutes] POST /send/:receiverId error', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

export default router;
