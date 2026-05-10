import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import { teacherController } from '../container';

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
router.get('/stats', (req, res, next) => teacherController.getStats(req, res, next));

// =============================================================================
// MARKETPLACE — LISTINGS
// =============================================================================

/**
 * GET /api/teacher/listings
 * Get all listings belonging to the authenticated teacher.
 */
router.get('/listings', (req, res, next) => teacherController.getListings(req, res, next));

/**
 * POST /api/teacher/listings
 * Create a new service listing.
 */
router.post('/listings', (req, res, next) => teacherController.createListing(req, res, next));

/**
 * PATCH /api/teacher/listings/:id
 * Toggle active/inactive or update a listing.
 */
router.patch('/listings/:id', (req, res, next) => teacherController.updateListing(req, res, next));

/**
 * DELETE /api/teacher/listings/:id
 * Remove a listing.
 */
router.delete('/listings/:id', (req, res, next) => teacherController.deleteListing(req, res, next));

// =============================================================================
// AVAILABILITY SCHEDULE
// =============================================================================

/**
 * GET /api/teacher/availability
 * Returns the authenticated teacher's recurring weekly availability rules.
 */
router.get('/availability', (req, res, next) => teacherController.getAvailability(req, res, next));

/**
 * PUT /api/teacher/availability
 * Replaces the teacher's entire weekly schedule.
 */
router.put('/availability', (req, res, next) => teacherController.updateAvailability(req, res, next));

// =============================================================================
// MARKETPLACE — ORDERS (incoming student requests)
// =============================================================================

/**
 * GET /api/teacher/orders
 * Get all marketplace orders directed at this teacher.
 */
router.get('/orders', (req, res, next) => teacherController.getOrders(req, res, next));

/**
 * PATCH /api/teacher/orders/:id
 * Accept or decline an order. Body: { status: 'accepted' | 'rejected' }
 */
router.patch('/orders/:id', (req, res, next) => teacherController.updateOrder(req, res, next));

// =============================================================================
// PAYMENTS & WALLET
// =============================================================================

/**
 * GET /api/teacher/transactions
 * Returns wallet balance and transaction history from completed marketplace requests.
 */
router.get('/transactions', (req, res, next) => teacherController.getTransactions(req, res, next));

/**
 * POST /api/teacher/withdraw
 * Simulate a withdrawal request. Deducts from wallet_balance and records a notification.
 */
router.post('/withdraw', (req, res, next) => teacherController.withdraw(req, res, next));

// =============================================================================
// MESSENGER
// =============================================================================

/**
 * GET /api/teacher/conversations
 */
router.get('/conversations', (req, res, next) => teacherController.getConversations(req, res, next));

/**
 * GET /api/teacher/messages/:conversationId
 */
router.get('/messages/:conversationId', (req, res, next) => teacherController.getMessages(req, res, next));

/**
 * POST /api/teacher/messages/:receiverId
 */
router.post('/messages/:receiverId', (req, res, next) => teacherController.sendMessage(req, res, next));

// =============================================================================
// NOTIFICATIONS
// =============================================================================

router.get('/notifications', (req, res, next) => teacherController.getNotifications(req, res, next));

router.patch('/notifications/read-all', (req, res, next) => teacherController.markNotificationsAsRead(req, res, next));

export default router;
