import { Router, Request, Response } from 'express';
import sequelize from '../config/database';
import { Op } from 'sequelize';
import { verifyToken } from '../middleware/authMiddleware';
import Reservation from '../models/Reservation';
import TeacherListing from '../models/TeacherListing';
import MarketplaceRequest from '../models/MarketplaceRequest';
import Notification from '../models/Notification';
import User from '../models/User';

const router = Router();
const RESERVATION_DURATION_MS = 5 * 60 * 1000; // 5 minutes

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
// Student confirms payment. Atomic transaction:
//   1. Validate reservation is still pending + not expired (Optimistic Lock)
//   2. Validate student wallet_balance >= listing price
//   3. Deduct from student, credit to teacher
//   4. Create MarketplaceRequest, mark reservation completed
//   5. Notify both parties
// =============================================================================
// router.post('/:reservationId/pay', async (req: Request, res: Response): Promise<void> => {
//     console.log('[ReservationRoutes] POST /:reservationId/pay called', {
//         reservationId: req.params.reservationId,
//         uid: req.user?.uid,
//     });

//     const t = await sequelize.transaction();

//     try {
//         const studentId = req.user!.uid;
//         const reservationId = parseInt(req.params.reservationId, 10);
//         // version from body is the client-side snapshot — used for Optimistic Lock check
//         const { version: clientVersion, scheduledAt } = req.body;

//         if (isNaN(reservationId)) {
//             await t.rollback();
//             res.status(400).json({ error: 'Invalid reservation ID' });
//             return;
//         }

//         // Step 1: Fetch and lock the reservation row
//         const reservation = await Reservation.findOne({
//             where: { id: reservationId, studentId },
//             transaction: t,
//             lock: t.LOCK.UPDATE,
//         });

//         if (!reservation) {
//             await t.rollback();
//             res.status(404).json({ error: 'Reservation not found or access denied' });
//             return;
//         }

//         // Step 2: Optimistic Lock — version must match
//         if (clientVersion !== undefined && reservation.version !== clientVersion) {
//             await t.rollback();
//             console.warn('[ReservationRoutes] POST /:reservationId/pay Optimistic Lock conflict', {
//                 dbVersion: reservation.version,
//                 clientVersion,
//             });
//             res.status(409).json({ error: 'Reservation state has changed. Please refresh and try again.' });
//             return;
//         }

//         // Step 3: Reservation must still be pending and within the 5-min window
//         if (reservation.status !== 'pending' || reservation.expiresAt < new Date()) {
//             await t.rollback();
//             res.status(410).json({ error: 'Your reservation has expired. The slot is now available for others.' });
//             return;
//         }

//         // Step 4: Fetch listing for the price
//         const listing = await TeacherListing.findByPk(reservation.listingId, { transaction: t });
//         if (!listing) {
//             await t.rollback();
//             res.status(404).json({ error: 'Listing no longer exists' });
//             return;
//         }

//         const price = Number(listing.pricePerHour);

//         // Step 5: Fetch student and validate wallet (Minus Cash check)
//         const student = await User.findByPk(studentId, { transaction: t, lock: t.LOCK.UPDATE });
//         if (!student) {
//             await t.rollback();
//             res.status(404).json({ error: 'Student account not found' });
//             return;
//         }

//         const studentBalance = Number(student.wallet_balance ?? 0);
//         if (studentBalance < price) {
//             await t.rollback();
//             console.log('[ReservationRoutes] POST /:reservationId/pay insufficient credits', {
//                 balance: studentBalance,
//                 price,
//             });
//             res.status(402).json({
//                 error: 'Insufficient IELTS Credits. Please top up your wallet.',
//                 required: price,
//                 available: studentBalance,
//             });
//             return;
//         }

//         // Step 6: Fetch teacher (just to verify they exist, though not strictly necessary if listing is tied to them)
//         const teacher = await User.findByPk(listing.teacherId, { transaction: t });
//         if (!teacher) {
//             await t.rollback();
//             res.status(404).json({ error: 'Teacher account not found' });
//             return;
//         }

//         // Step 7: Execute the atomic wallet transfer (Deduct from student only, hold in escrow)
//         await student.update({ wallet_balance: studentBalance - price }, { transaction: t });
//         // Teacher is NOT credited here. They are credited by the cron job after the session completes.

//         // Step 8: Mark reservation as completed
//         await reservation.update({ status: 'completed' }, { transaction: t });

//         // Step 9: Create the official MarketplaceRequest
//         const marketplaceRequest = await MarketplaceRequest.create(
//             {
//                 studentId,
//                 teacherId: listing.teacherId,
//                 attemptId: null,
//                 status: 'accepted',
//                 fee: price,
//                 skill: listing.skills?.[0] ?? null,
//                 message: `Coaching session booked via marketplace reservation #${reservation.id}`,
//                 feedbackPath: null,
//                 requestType: 'booking',
//                 // Save the specific time slot chosen by the student in the calendar
//                 scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
//                 durationMinutes: listing.sessionDuration ?? 60,
//             },
//             { transaction: t }
//         );

//         // Step 10: Commit everything
//         await t.commit();

//         // Step 11: Fire notifications (outside transaction for non-critical path)
//         const teacherName = `${teacher.firstName} ${teacher.lastName}`.trim();
//         const studentName = `${student.firstName} ${student.lastName}`.trim();
//         const serviceLabel = listing.skills?.[0] ? `IELTS ${listing.skills[0]} Coaching` : listing.title;
//         const priceFormatted = price.toLocaleString('vi-VN');

//         await Promise.all([
//             Notification.create({
//                 userId: studentId,
//                 type: 'payment',
//                 title: '🎉 Booking Confirmed!',
//                 body: `You've successfully booked "${serviceLabel}" with ${teacherName} for ${priceFormatted} 🧠 Credits.`,
//                 linkPath: '/my-requests',
//             }),
//             Notification.create({
//                 userId: listing.teacherId,
//                 type: 'order',
//                 title: '🛎️ New Session Booked!',
//                 body: `${studentName} has confirmed a booking for "${serviceLabel}". ${priceFormatted} 🧠 Credits are held in escrow and will be transferred to your wallet after completion.`,
//                 linkPath: '/teacher/marketplace',
//             }),
//         ]);

//         console.log('[ReservationRoutes] POST /:reservationId/pay success', {
//             reservationId: reservation.id,
//             requestId: marketplaceRequest.id,
//             price,
//         });

//         res.status(201).json({
//             success: true,
//             marketplaceRequestId: marketplaceRequest.id,
//             newBalance: studentBalance - price,
//             message: `Payment of ${priceFormatted} 🧠 Credits confirmed!`,
//         });
//     } catch (error) {
//         await t.rollback();
//         console.error('[ReservationRoutes] POST /:reservationId/pay error', error);
//         res.status(500).json({ error: 'Payment failed. Your credits have not been charged.' });
//     }
// });

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
