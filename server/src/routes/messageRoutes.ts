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
router.get('/conversations', (req, res, next) => messageController.getConversations(req, res, next));

/**
 * GET /api/messages/:conversationId
 * Returns all messages in a specific conversation.
 * Also marks all received messages as read.
 */
router.get('/:conversationId', (req, res, next) => messageController.getMessages(req, res, next));

/**
 * POST /api/messages/send/:receiverId
 * Send a message to another user. Body: { content, type? }
 * Works for both students messaging teachers and vice versa.
 */
router.post('/send/:receiverId', (req, res, next) => messageController.sendMessage(req, res, next));

export default router;
