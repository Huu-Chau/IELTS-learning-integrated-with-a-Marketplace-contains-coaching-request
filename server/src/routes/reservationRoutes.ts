import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import { reservationController } from '../container';

const router = Router();

// ─── All routes require authentication ────────────────────────────────────────
router.use(verifyToken());

// =============================================================================
// POST /api/reservations/:reservationId/pay
// Student confirms payment.
// =============================================================================
router.post('/:reservationId/pay', (req: Request, res: Response, next: NextFunction) => {
    console.log('[ReservationRoutes] POST /:reservationId/pay called', {
        reservationId: req.params.reservationId,
        uid: req.user?.uid,
    });
    return reservationController.payForReservation(req, res, next);
});

// =============================================================================
// GET /api/reservations/listing/:listingId
// Returns the active reservation status for a listing.
// Used by the frontend to determine: Available / Pending / Booked.
// =============================================================================
router.get('/listing/:listingId', (req: Request, res: Response, next: NextFunction) => {
    console.log('[ReservationRoutes] GET /listing/:listingId called', {
        listingId: req.params.listingId,
        uid: req.user?.uid,
    });
    return reservationController.getReservationStatusByListing(req, res, next);
});

export default router;