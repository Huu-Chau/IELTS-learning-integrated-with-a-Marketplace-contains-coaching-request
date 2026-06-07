import { Op } from 'sequelize';
import TeacherListing from '../models/TeacherListing';
import MarketplaceRequest from '../models/MarketplaceRequest';
import User from '../models/User';
import Reservation from '../models/Reservation';
import { MarketplaceRequestStatus } from '../types/marketplace-request';
import { ReservationStatus } from '../types/reservation';
import { BrowseListingsQuery, CreateBookingPayload } from '../types/marketplace';
import TeacherAvailability from '../models/TeacherAvailability';

export interface IMarketplaceService {
    getListings(query: BrowseListingsQuery, currentUserId?: string): Promise<any[]>;
    getListingById(id: string): Promise<any>;
    createBooking(payload: CreateBookingPayload): Promise<any>;
    getStudentRequests(studentId: string): Promise<any[]>;
    getStudentPayments(studentId: string): Promise<any>;
}

export class MarketplaceService implements IMarketplaceService {
    async getListings(query: BrowseListingsQuery, currentUserId?: string): Promise<any[]> {
        const { skill, maxPrice, search } = query;

        // Build dynamic where clause
        const where: Record<string, unknown> = { isActive: true };

        if (skill) {
            where.skills = { [Op.contains]: [skill] };
        }

        if (maxPrice !== undefined) {
            where.pricePerHour = { [Op.lte]: maxPrice };
        }

        if (search) {
            where[Op.or as unknown as string] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
            ];
        }

        const listings = await TeacherListing.findAll({
            where,
            order: [['createdAt', 'DESC']],
        });

        // Enrich each listing
        return Promise.all(
            listings.map(async (listing) => {
                const teacher = await User.findByPk(listing.teacherId, {
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                });

                const activeReservation = await Reservation.findOne({
                    where: {
                        'listing.id': listing.id,
                        status: ReservationStatus.PENDING,
                        expiresAt: { [Op.gt]: new Date() },
                    },
                    attributes: ['studentId', 'expiresAt'],
                });

                const hasAvailableSlot = await TeacherAvailability.findOne({
                    where: {
                        teacherId: listing.teacherId,
                        isAvailable: true,
                    }
                });

                let reservationStatus: 'available' | 'pending' | 'booked' = 'available';
                let isOwnReservation = false;
                let reservationExpiresAt: Date | null = null;

                if (!hasAvailableSlot) {
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
                    reservationStatus,
                    isOwnReservation,
                    reservationExpiresAt,
                };
            })
        );
    }

    async getListingById(id: string): Promise<any> {
        const listing = await TeacherListing.findOne({
            where: { id, isActive: true },
        });

        if (!listing) return null;

        const teacher = await User.findByPk(listing.teacherId, {
            attributes: ['id', 'firstName', 'lastName', 'email'],
        });

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
        };
    }

    async createBooking(payload: CreateBookingPayload): Promise<any> {
        const { listingId, teacherId, studentId, message, attemptId } = payload;

        // Duplicate guard
        const existingRequest = await MarketplaceRequest.findOne({
            where: { studentId, teacherId, status: 'pending' },
        });

        if (existingRequest) {
            throw new Error('You already have a pending request with this tutor. Please wait for them to respond before submitting again.');
        }

        const listing = await TeacherListing.findOne({
            where: { id: listingId, teacherId, isActive: true },
        });

        if (!listing) {
            throw new Error('Listing not found or is no longer active');
        }

        const primarySkill = listing.skills?.[0] ?? null;
        const serviceLabel = primarySkill ? `IELTS ${primarySkill} Review` : listing.title;
        const amountFormatted = Number(listing.pricePerHour).toLocaleString('vi-VN');

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

        return {
            ...request.toJSON(),
            serviceLabel,
            amountFormatted,
        };
    }

    async getStudentRequests(studentId: string): Promise<any[]> {
        const requests = await MarketplaceRequest.findAll({
            where: { studentId },
            order: [['createdAt', 'DESC']],
        });

        return Promise.all(
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
    }

    async getStudentPayments(studentId: string): Promise<any> {
        const student = await User.findByPk(studentId);
        const requests = await MarketplaceRequest.findAll({
            where: { studentId },
            order: [['createdAt', 'DESC']],
        });

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

        const totalSpent = payments
            .filter((p) => p.rawStatus === 'accepted' || p.rawStatus === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);

        return {
            walletBalance: Number(student?.wallet_balance ?? 0),
            payments,
            totalSpent
        };
    }
}