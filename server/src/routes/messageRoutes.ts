import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import { messageController } from '../container';

const router = Router();

// ─── All routes require authentication ────────────────────────────────────────
router.use(verifyToken());

/**
 * GET /api/messages/conversations
 * Returns all conversations for the authenticated user (student OR teacher).
 * Each conversation shows the last message, the other participant, and unread count.
 */
router.get('/conversations', messageController.getConversations);

/**
 * GET /api/messages/:conversationId
 * Returns all messages in a specific conversation.
 * Also marks all received messages as read.
 */
router.get('/:conversationId', messageController.getMessages);

/**
 * POST /api/messages/send/:receiverId
 * Send a message to another user. Body: { content, type? }
 * Works for both students messaging teachers and vice versa.
 */
router.post('/send/:receiverId', messageController.sendMessage);

export default router;
