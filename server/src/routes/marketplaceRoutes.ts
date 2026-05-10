import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import { marketplaceController } from '../container';

const router = Router();

// ─── All routes require authentication ────────────────────────────────────────
router.use(verifyToken());

// =============================================================================
// PUBLIC BROWSE — LISTINGS (Student-facing)
// =============================================================================

/**
 * GET /api/marketplace/listings
 * Returns all active teacher listings enriched with teacher profile info.
 */
router.get('/listings', (req, res, next) => marketplaceController.getListings(req, res, next));

/**
 * GET /api/marketplace/listings/:id
 * Returns a single listing detail with teacher profile.
 */
router.get('/listings/:id', (req, res, next) => marketplaceController.getListingById(req, res, next));

// =============================================================================
// STUDENT REQUESTS — Create & View Orders
// =============================================================================

/**
 * POST /api/marketplace/requests
 * Student creates a new marketplace request (booking) for a teacher's service.
 */
router.post('/requests', (req, res, next) => marketplaceController.createBooking(req, res, next));

/**
 * GET /api/marketplace/requests/mine
 * Returns all marketplace requests submitted by the authenticated student.
 */
router.get('/requests/mine', (req, res, next) => marketplaceController.getStudentRequests(req, res, next));

/**
 * GET /api/marketplace/payments
 * Returns the authenticated student's full payment history.
 */
router.get('/payments', (req, res, next) => marketplaceController.getStudentPayments(req, res, next));

/**
 * GET /api/marketplace/teachers/:uid/availability
 * Returns available 1-hour booking slots for a teacher over the next 14 days.
 */
router.get('/teachers/:uid/availability', (req, res, next) => marketplaceController.getTeacherAvailability(req, res, next));

export default router;