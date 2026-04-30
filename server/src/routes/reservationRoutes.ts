import { Router, Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { verifyToken } from '../middleware/authMiddleware';
import Reservation from '../models/Reservation';
import { reservationController } from '../container';

const router = Router();

// ─── All routes require authentication ────────────────────────────────────────
router.use(verifyToken());

// ─── Helper: expire stale reservations (Lazy Cleanup) ────────────────────────
// Called before every listing/reservation read so the DB stays clean
// without needing a background cron job.
async function expireStaleReservations(): Promise<void> {
    console.log('[ReservationRoutes] expireStaleReservations called');
    try {
        const expired = await Reservation.update(
            { status: 'expired' },
            {
                where: {
                    status: 'pending',
                    expiresAt: { [Op.lt]: new Date() },
                },
            }
        );
        if (expired[0] > 0) {
            console.log('[ReservationRoutes] expireStaleReservations success', { count: expired[0] });
        }
    } catch (error) {
        console.error('[ReservationRoutes] expireStaleReservations error', error);
    }
}

// =============================================================================
// POST /api/reservations/:listingId
// Student initiates a 5-minute checkout lease on a listing.
// Only one active (pending + not expired) reservation per listing is allowed.
// =============================================================================
// router.post('/:listingId', async (req: Request, res: Response): Promise<void> => {
//     console.log('[ReservationRoutes] POST /:listingId called', {
//         listingId: req.params.listingId,
//         uid: req.user?.uid,
//     });

//     try {
//         const studentId = req.user!.uid;
//         const listingId = parseInt(req.params.listingId, 10);

//         if (isNaN(listingId)) {
//             res.status(400).json({ error: 'Invalid listing ID' });
//             return;
//         }

//         // Step 1: Lazy-expire any stale reservations first
//         await expireStaleReservations();

//         // Step 2: Check if listing exists and is active
//         const listing = await TeacherListing.findOne({
//             where: { id: listingId, isActive: true },
//         });

//         if (!listing) {
//             console.log('[ReservationRoutes] POST /:listingId listing not found', { listingId });
//             res.status(404).json({ error: 'Listing not found or no longer active' });
//             return;
//         }

//         // Step 3: Block if another student already holds an active reservation
//         const existingReservation = await Reservation.findOne({
//             where: {
//                 listingId,
//                 status: 'pending',
//                 expiresAt: { [Op.gt]: new Date() }, // still within the 5-min window
//             },
//         });

//         if (existingReservation) {
//             const isOwn = existingReservation.studentId === studentId;
//             if (isOwn) {
//                 // Student already has the lock — return the existing one so
//                 // the frontend can resume the countdown from the correct expiresAt.
//                 console.log('[ReservationRoutes] POST /:listingId returning existing own reservation', {
//                     id: existingReservation.id,
//                 });
//                 res.json({
//                     reservation: existingReservation,
//                     message: 'Resuming your existing reservation',
//                 });
//                 return;
//             }

//             // Another student holds the lock
//             console.log('[ReservationRoutes] POST /:listingId conflict — listing already reserved', {
//                 reservedBy: existingReservation.studentId,
//             });
//             res.status(409).json({
//                 error: 'This coaching slot is currently being booked by another student. Please try again shortly.',
//                 lockedUntil: existingReservation.expiresAt,
//             });
//             return;
//         }

//         // Step 4: Create the reservation lease
//         const expiresAt = new Date(Date.now() + RESERVATION_DURATION_MS);
//         const reservation = await Reservation.create({
//             listingId,
//             studentId,
//             expiresAt,
//             status: 'pending',
//         });

//         console.log('[ReservationRoutes] POST /:listingId success', {
//             reservationId: reservation.id,
//             expiresAt,
//         });
//         res.status(201).json({ reservation });
//     } catch (error) {
//         console.error('[ReservationRoutes] POST /:listingId error', error);
//         res.status(500).json({ error: 'Failed to create reservation' });
//     }
// });

// =============================================================================
// POST /api/reservations/:reservationId/pay
// Student confirms payment.
// =============================================================================
router.post('/:reservationId/pay', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('[ReservationRoutes] POST /:reservationId/pay called', {
        reservationId: req.params.reservationId,
        uid: req.user?.uid,
    });

    try {
        return await reservationController.payForReservation(req, res, next);
    } catch (error) {
        console.error('[ReservationRoutes] POST /:reservationId/pay error', error);
        res.status(500).json({ error: 'Payment failed. Your credits have not been charged.' });
    }
});

// =============================================================================
// GET /api/reservations/listing/:listingId
// Returns the active reservation status for a listing.
// Used by the frontend to determine: Available / Pending / Booked.
// =============================================================================
router.get('/listing/:listingId', async (req: Request, res: Response): Promise<void> => {
    console.log('[ReservationRoutes] GET /listing/:listingId called', {
        listingId: req.params.listingId,
        uid: req.user?.uid,
    });

    try {
        await expireStaleReservations();

        const listingId = parseInt(req.params.listingId, 10);

        const activeReservation = await Reservation.findOne({
            where: {
                'listing.id': listingId,
                status: 'pending',
                expiresAt: { [Op.gt]: new Date() },
            },
        });

        if (!activeReservation) {
            res.json({ status: 'available' });
            return;
        }

        const isOwn = activeReservation.studentId === req.user!.uid;
        res.json({
            status: 'pending',
            isOwn,
            expiresAt: activeReservation.expiresAt,
            reservationId: isOwn ? activeReservation.id : undefined,
            version: isOwn ? activeReservation.version : undefined,
        });

        console.log('[ReservationRoutes] GET /listing/:listingId success', {
            listingId,
            status: 'pending',
            isOwn,
        });
    } catch (error) {
        console.error('[ReservationRoutes] GET /listing/:listingId error', error);
        res.status(500).json({ error: 'Failed to fetch reservation status' });
    }
});

export default router;