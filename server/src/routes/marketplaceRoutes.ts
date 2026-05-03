import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { verifyToken } from '../middleware/authMiddleware';
import TeacherListing from '../models/TeacherListing';
import MarketplaceRequest from '../models/MarketplaceRequest';
import Notification from '../models/Notification';
import User from '../models/User';
import Reservation from '../models/Reservation';
import { GetAvailabilityParams } from '../types/availability';
import { TeacherAvailabilityService, ITeacherAvailabilityService } from '../services/teacherAvailabilityService';
import { NotificationService } from '../services/notificationService';
import { CreateNotificationPayload, NotificationType } from '../types/notification';
import { MarketplaceRequestStatus } from '../types/marketplace-request';

const notificationService = new NotificationService();

const router = Router();
// ─── All routes require authentication ────────────────────────────────────────
router.use(verifyToken());

const teacherAvailabilityService: ITeacherAvailabilityService = new TeacherAvailabilityService();
// =============================================================================
// PUBLIC BROWSE — LISTINGS (Student-facing)
// =============================================================================

/**
 * GET /api/marketplace/listings
 * Returns all active teacher listings enriched with teacher profile info.
 * Students use this to browse available services.
 *
 * Query params:
 *   ?skill=Speaking     — filter by skill (case-insensitive partial match)
 *   ?maxPrice=25        — filter by max pricePerHour
 *   ?search=writing     — search title/description
 */
router.get('/listings', async (req: Request, res: Response): Promise<void> => {
    console.log('[MarketplaceRoutes] GET /listings called', { uid: req.user?.uid, query: req.query });
    try {
        const { skill, maxPrice, search } = req.query;

        // Build dynamic where clause
        const where: Record<string, unknown> = { isActive: true };

        if (skill && typeof skill === 'string') {
            // PostgreSQL ARRAY contains operator via Sequelize
            where.skills = { [Op.contains]: [skill] };
        }

        if (maxPrice && typeof maxPrice === 'string') {
            const price = parseFloat(maxPrice);
            if (!isNaN(price)) {
                where.pricePerHour = { [Op.lte]: price };
            }
        }

        if (search && typeof search === 'string') {
            where[Op.or as unknown as string] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
            ];
        }

        const listings = await TeacherListing.findAll({
            where,
            order: [['createdAt', 'DESC']],
        });

        // Enrich each listing with the teacher's profile data + reservation status
        const currentUserId = req.user?.uid;
        const enriched = await Promise.all(
            listings.map(async (listing) => {
                const teacher = await User.findByPk(listing.teacherId, {
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                });

                // Check if this listing has an active (non-expired) reservation
                const activeReservation = await Reservation.findOne({
                    where: {
                        'listing.id': listing.id,
                        status: 'pending',
                        expiresAt: { [Op.gt]: new Date() },
                    },
                    attributes: ['studentId', 'expiresAt'],
                });

                // Check if there's a completed booking for this listing
                const completedBooking = await Reservation.findOne({
                    where: {
                        'listing.id': listing.id,
                        status: 'completed',
                    },
                });

                let reservationStatus: 'available' | 'pending' | 'booked' = 'available';
                let isOwnReservation = false;
                let reservationExpiresAt: Date | null = null;

                if (completedBooking) {
                    reservationStatus = 'booked';
                } else if (activeReservation) {
                    reservationStatus = 'pending';
                    isOwnReservation = activeReservation.studentId === currentUserId;
                    reservationExpiresAt = activeReservation.expiresAt;
                }

                return {
                    id: listing.id,
                    teacherId: listing.teacherId,
                    title: listing.title,
                    description: listing.description,
                    skills: listing.skills,
                    pricePerHour: Number(listing.pricePerHour),
                    sessionDuration: listing.sessionDuration,
                    isActive: listing.isActive,
                    createdAt: listing.createdAt,
                    teacher: teacher
                        ? {
                            id: teacher.id,
                            name: `${teacher.firstName} ${teacher.lastName}`.trim(),
                            email: teacher.email,
                            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                `${teacher.firstName} ${teacher.lastName}`
                            )}&background=random`,
                        }
                        : null,
                    // Reservation status for frontend badge rendering
                    reservationStatus,
                    isOwnReservation,
                    reservationExpiresAt,
                };
            })
        );

        console.log('[MarketplaceRoutes] GET /listings success', { count: enriched.length });
        res.json(enriched);
    } catch (error) {
        console.error('[MarketplaceRoutes] GET /listings error', error);
        res.status(500).json({ error: 'Failed to fetch marketplace listings' });
    }
});

/**
 * GET /api/marketplace/listings/:id
 * Returns a single listing detail with teacher profile.
 */
router.get('/listings/:id', async (req: Request, res: Response): Promise<void> => {
    console.log('[MarketplaceRoutes] GET /listings/:id called', { id: req.params.id, uid: req.user?.uid });
    try {
        const listing = await TeacherListing.findOne({
            where: { id: req.params.id, isActive: true },
        });

        if (!listing) {
            console.log('[MarketplaceRoutes] GET /listings/:id not found', { id: req.params.id });
            res.status(404).json({ error: 'Listing not found' });
            return;
        }

        const teacher = await User.findByPk(listing.teacherId, {
            attributes: ['id', 'firstName', 'lastName', 'email'],
        });

        const result = {
            id: listing.id,
            teacherId: listing.teacherId,
            title: listing.title,
            description: listing.description,
            skills: listing.skills,
            pricePerHour: Number(listing.pricePerHour),
            sessionDuration: listing.sessionDuration,
            isActive: listing.isActive,
            createdAt: listing.createdAt,
            teacher: teacher
                ? {
                    id: teacher.id,
                    name: `${teacher.firstName} ${teacher.lastName}`.trim(),
                    email: teacher.email,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        `${teacher.firstName} ${teacher.lastName}`
                    )}&background=random`,
                }
                : null,
        };

        console.log('[MarketplaceRoutes] GET /listings/:id success', { id: listing.id });
        res.json(result);
    } catch (error) {
        console.error('[MarketplaceRoutes] GET /listings/:id error', error);
        res.status(500).json({ error: 'Failed to fetch listing' });
    }
});

// =============================================================================
// STUDENT REQUESTS — Create & View Orders
// =============================================================================

/**
 * POST /api/marketplace/requests
 * Student creates a new marketplace request (booking) for a teacher's service.
 * Body: { listingId, teacherId, message?, attemptId? }
 *
 * The fee is auto-pulled from the listing's pricePerHour.
 * If no attemptId is provided, a placeholder value of 0 is used (for general consultations).
 */
router.post('/requests', async (req: Request, res: Response): Promise<void> => {
    console.log('[MarketplaceRoutes] POST /requests called', { uid: req.user?.uid, body: req.body });
    try {
        const studentId = req.user!.uid;
        const { listingId, teacherId, message, attemptId } = req.body;

        // Validate required fields
        if (!listingId || !teacherId) {
            console.log('[MarketplaceRoutes] POST /requests failed: missing required fields');
            res.status(400).json({ error: 'listingId and teacherId are required' });
            return;
        }

        // ── Duplicate guard ──────────────────────────────────────────────
        // Prevent students from submitting the same booking twice while it is
        // still pending. Re-submitting after a rejection is allowed.
        const existingRequest = await MarketplaceRequest.findOne({
            where: { studentId, teacherId, status: 'pending' },
        });

        if (existingRequest) {
            console.log('[MarketplaceRoutes] POST /requests blocked: duplicate pending request', {
                existingId: existingRequest.id,
            });
            res.status(400).json({
                error: 'You already have a pending request with this tutor. Please wait for them to respond before submitting again.',
            });
            return;
        }
        // ────────────────────────────────────────────────────────────────

        // Fetch the listing to get the fee and skill info
        const listing = await TeacherListing.findOne({
            where: { id: listingId, teacherId, isActive: true },
        });

        if (!listing) {
            console.log('[MarketplaceRoutes] POST /requests failed: listing not found or inactive');
            res.status(404).json({ error: 'Listing not found or is no longer active' });
            return;
        }

        // Look up student name for notifications
        const student = await User.findByPk(studentId, { attributes: ['firstName', 'lastName'] });
        const studentName = student ? `${student.firstName} ${student.lastName}`.trim() : 'A student';

        // Determine the primary skill from the listing (first entry)
        const primarySkill = listing.skills?.[0] ?? null;
        const serviceLabel = primarySkill ? `IELTS ${primarySkill} Review` : listing.title;
        const amountFormatted = Number(listing.pricePerHour).toLocaleString('vi-VN');

        // Create the MarketplaceRequest — status stays 'pending' until teacher accepts
        const request = await MarketplaceRequest.create({
            studentId,
            teacherId,
            attemptId: attemptId || null,
            status: MarketplaceRequestStatus.PENDING,
            fee: Number(listing.pricePerHour),
            message: message || null,
            skill: primarySkill,
            feedbackPath: null,
        });

        // ── Fire notifications to both parties ──────────────────────────
        // (Handled automatically by Event-Driven Kafka consumer on afterCreate hook)

        console.log('[MarketplaceRoutes] POST /requests success', { id: request.id, fee: request.fee });
        res.status(201).json({
            ...request.toJSON(),
            serviceLabel,
            amountFormatted,
        });
    } catch (error) {
        console.error('[MarketplaceRoutes] POST /requests error', error);
        res.status(500).json({ error: 'Failed to create marketplace request' });
    }
});

/**
 * GET /api/marketplace/requests/mine
 * Returns all marketplace requests submitted by the authenticated student.
 * Enriched with teacher name and listing title.
 */
router.get('/requests/mine', async (req: Request, res: Response): Promise<void> => {
    console.log('[MarketplaceRoutes] GET /requests/mine called', { uid: req.user?.uid });
    try {
        const studentId = req.user!.uid;

        const requests = await MarketplaceRequest.findAll({
            where: { studentId },
            order: [['createdAt', 'DESC']],
        });

        // Enrich with teacher and listing info
        const enriched = await Promise.all(
            requests.map(async (req) => {
                const teacher = req.teacherId
                    ? await User.findByPk(req.teacherId, {
                        attributes: ['id', 'firstName', 'lastName', 'email'],
                    })
                    : null;
                return {
                    id: req.id,
                    teacherId: req.teacherId,
                    teacherName: teacher
                        ? `${teacher.firstName} ${teacher.lastName}`.trim()
                        : 'Unknown',
                    status: req.status,
                    fee: Number(req.fee),
                    feedbackPath: req.feedbackPath,
                    createdAt: req.createdAt,
                    updatedAt: req.updatedAt,
                };
            })
        );

        console.log('[MarketplaceRoutes] GET /requests/mine success', { count: enriched.length });
        res.json(enriched);
    } catch (error) {
        console.error('[MarketplaceRoutes] GET /requests/mine error', error);
        res.status(500).json({ error: 'Failed to fetch your requests' });
    }
});

/**
 * GET /api/marketplace/payments
 * Returns the authenticated student's full payment history.
 * Derived from their MarketplaceRequests — each accepted/completed request represents a charge.
 * Pending/rejected requests are included so the student can track all activity.
 */
router.get('/payments', async (req: Request, res: Response): Promise<void> => {
    console.log('[MarketplaceRoutes] GET /payments called', { uid: req.user?.uid });
    try {
        const studentId = req.user!.uid;
        const student = await User.findByPk(studentId);

        const requests = await MarketplaceRequest.findAll({
            where: { studentId },
            order: [['createdAt', 'DESC']],
        });

        // Map status to payment-friendly labels
        const statusMap: Record<string, string> = {
            pending: 'Pending',
            accepted: 'Processing',
            completed: 'Paid',
            rejected: 'Refunded',
        };

        const payments = await Promise.all(
            requests.map(async (r) => {
                const teacher = r.teacherId
                    ? await User.findByPk(r.teacherId, {
                        attributes: ['id', 'firstName', 'lastName'],
                    })
                    : null;
                return {
                    id: r.id,
                    teacherName: teacher
                        ? `${teacher.firstName} ${teacher.lastName}`.trim()
                        : 'Unknown Tutor',
                    service: r.skill ? `IELTS ${r.skill} Review` : 'IELTS Expert Review',
                    amount: Number(r.fee ?? 0),
                    status: statusMap[r.status] ?? r.status,
                    rawStatus: r.status,
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt,
                };
            })
        );

        // Total spent = sum of accepted + completed requests
        const totalSpent = payments
            .filter((p) => p.rawStatus === 'accepted' || p.rawStatus === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);

        console.log('[MarketplaceRoutes] GET /payments success', { count: payments.length, totalSpent });
        res.json({
            walletBalance: Number(student?.wallet_balance ?? 0),
            payments,
            totalSpent
        });
    } catch (error) {
        console.error('[MarketplaceRoutes] GET /payments error', error);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
});

/**
 * GET /api/marketplace/teachers/:uid/availability
 * Returns available 1-hour booking slots for a teacher over the next 14 days.
 * Automatically subtracts already-booked time slots.
 */
router.get('/teachers/:uid/availability', async (req: Request, res: Response): Promise<void> => {
    console.log('[MarketplaceRoutes] GET /teachers/:uid/availability called', { uid: req.params.uid });
    try {
        const teacherId = req.params.uid;

        const now = new Date();
        const next14Days = new Date(new Date().setDate(now.getDate() + 14));
        const getAvailabilityParams = new GetAvailabilityParams(
            teacherId,
            now,
            next14Days
        );

        const availability = await teacherAvailabilityService.getAvailability(getAvailabilityParams);

        res.json({ slots: availability });
    } catch (error) {
        console.error('[MarketplaceRoutes] GET /teachers/:uid/availability error', error);
        res.status(500).json({ error: 'Failed to fetch teacher availability' });
    }
});

export default router;