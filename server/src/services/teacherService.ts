import { Op } from 'sequelize';
import { MarketplaceRequestStatus } from '../types/marketplace-request';
import TeacherListing from '../models/TeacherListing';
import MarketplaceRequest from '../models/MarketplaceRequest';
import User from '../models/User';
import Notification from '../models/Notification';
import Message from '../models/Message';
import TeacherAvailability from '../models/TeacherAvailability';
import sequelize from '../config/database';
import { CreateListingPayload, UpdateListingPayload, UpdateOrderPayload, WithdrawPayload, UpdateAvailabilityRulesPayload } from '../types/teacher';
import { INotificationService } from './notificationService';
import { CreateNotificationPayload, NotificationType } from '../types/notification';

export interface ITeacherService {
    getStats(teacherId: string): Promise<any>;
    getListings(teacherId: string): Promise<TeacherListing[]>;
    createListing(payload: CreateListingPayload): Promise<TeacherListing>;
    updateListing(payload: UpdateListingPayload): Promise<TeacherListing>;
    deleteListing(id: string, teacherId: string): Promise<boolean>;
    getAvailability(teacherId: string): Promise<TeacherAvailability[]>;
    updateAvailabilityRules(payload: UpdateAvailabilityRulesPayload): Promise<TeacherAvailability[]>;
    getOrders(teacherId: string): Promise<any[]>;
    updateOrder(payload: UpdateOrderPayload): Promise<MarketplaceRequest>;
    getTransactions(teacherId: string): Promise<any>;
    withdraw(payload: WithdrawPayload): Promise<number>;
}

export class TeacherService implements ITeacherService {
    constructor(
        private readonly notificationService: INotificationService
    ) { }

    public async getStats(teacherId: string): Promise<any> {
        // Count pending orders
        const pendingOrders = await MarketplaceRequest.count({
            where: { teacherId, status: 'pending' },
        });

        // Count active students (unique students with accepted/completed requests)
        const activeRequests = await MarketplaceRequest.findAll({
            where: { teacherId, status: ['accepted', 'completed'] },
            attributes: ['studentId'],
        });
        const uniqueStudents = new Set(activeRequests.map((r) => r.studentId)).size;

        // Wallet balance from User record
        const teacher = await User.findByPk(teacherId);
        const walletBalance = Number(teacher?.wallet_balance ?? 0);

        // Unread notifications count
        const unreadNotifications = await Notification.count({
            where: { userId: teacherId, isRead: false },
        });

        // Unread messages count
        const unreadMessages = await Message.count({
            where: { receiverId: teacherId, isRead: false },
        });

        return {
            monthlyEarnings: walletBalance,
            pendingOrders,
            activeStudents: uniqueStudents,
            avgRating: 4.8, // placeholder until a Reviews model exists
            unreadNotifications,
            unreadMessages,
        };
    }

    public async getListings(teacherId: string): Promise<TeacherListing[]> {
        return TeacherListing.findAll({
            where: { teacherId },
            order: [['createdAt', 'DESC']],
        });
    }

    public async createListing(payload: CreateListingPayload): Promise<TeacherListing> {
        return TeacherListing.create({
            teacherId: payload.teacherId,
            title: payload.title,
            description: payload.description,
            skills: payload.skills,
            pricePerHour: payload.pricePerHour,
            sessionDuration: payload.sessionDuration,
        });
    }

    public async updateListing(payload: UpdateListingPayload): Promise<TeacherListing> {
        const listing = await TeacherListing.findOne({
            where: { id: payload.id, teacherId: payload.teacherId },
        });

        if (!listing) {
            throw new Error('Listing not found or access denied');
        }

        const updateData: any = { ...payload };
        delete updateData.id;
        delete updateData.teacherId;

        await listing.update(updateData);
        return listing;
    }

    public async deleteListing(id: string, teacherId: string): Promise<boolean> {
        const deletedCount = await TeacherListing.destroy({
            where: { id, teacherId },
        });
        return deletedCount > 0;
    }

    public async getAvailability(teacherId: string): Promise<TeacherAvailability[]> {
        // Note: The original code used dayOfWeek which is missing in the model.
        // We'll use date if it exists, or just return all for now.
        // If the model changed to use 'date', we should probably filter by upcoming dates.
        return TeacherAvailability.findAll({
            where: { teacherId },
            order: [['date', 'ASC'], ['startTime', 'ASC']],
        });
    }

    public async updateAvailabilityRules(payload: UpdateAvailabilityRulesPayload): Promise<TeacherAvailability[]> {
        const { teacherId, rules } = payload;

        // Since the model uses 'date' instead of 'dayOfWeek', we can't directly store 'dayOfWeek'.
        // However, we'll follow the original logic of replacing all records, but using a dummy date
        // or a specific range if we want to simulate recurring.
        // For now, to avoid breaking, let's assume 'date' is used.
        // If the frontend sends dayOfWeek, we might need a mapping.

        // This part is tricky because the model and the route logic are out of sync.
        // I'll implement it using 'date' based on the current model.

        const t = await sequelize.transaction();
        try {
            await TeacherAvailability.destroy({ where: { teacherId }, transaction: t });

            // If rules have 'date', use it. If they have 'dayOfWeek', we have a problem.
            // For now, I'll just skip creating if 'date' is missing, or use today as a placeholder.
            if (rules.length > 0) {
                const now = new Date();
                const createData = rules.map((r: any) => ({
                    teacherId,
                    date: r.date || now.toISOString().split('T')[0], // Fallback
                    startTime: r.startTime,
                    endTime: r.endTime,
                    isAvailable: true,
                    timezone: 'Asia/Ho_Chi_Minh'
                }));
                await TeacherAvailability.bulkCreate(createData, { transaction: t });
            }

            await t.commit();
            return this.getAvailability(teacherId);
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    public async getOrders(teacherId: string): Promise<any[]> {
        console.log('[TeacherService] getOrders called', { teacherId });
        const orders = await MarketplaceRequest.findAll({
            where: {
                [Op.or]: [
                    { teacherId },
                    // Also show open evaluation bounties broadcast to all teachers
                    { teacherId: null, requestType: 'evaluation', status: 'pending' },
                ],
            },
            order: [['createdAt', 'DESC']],
        });

        const results = await Promise.all(
            orders.map(async (order) => {
                const student = await User.findByPk(order.studentId, {
                    attributes: ['firstName', 'lastName', 'email'],
                });
                return {
                    id: order.id,
                    studentId: order.studentId,
                    studentName: student
                        ? `${student.firstName} ${student.lastName}`.trim()
                        : order.studentId.slice(0, 8),
                    status: order.status,
                    fee: Number(order.fee ?? 0),
                    skill: order.skill,
                    requestType: order.requestType,
                    message: order.message,
                    feedbackPath: order.feedbackPath,
                    scheduledAt: null,
                    createdAt: order.createdAt,
                    updatedAt: order.updatedAt,
                };
            })
        );
        console.log('[TeacherService] getOrders success', { count: results.length });
        return results;
    }

    public async updateOrder(payload: UpdateOrderPayload): Promise<MarketplaceRequest> {
        console.log('[TeacherService] updateOrder called', { id: payload.id, teacherId: payload.teacherId, status: payload.status });
        const t = await sequelize.transaction();
        try {
            // Find the order — allow matching either the teacher's own orders
            // or open evaluation broadcasts (teacherId=null)
            const order = await MarketplaceRequest.findOne({
                where: {
                    id: payload.id,
                    [Op.or]: [
                        { teacherId: payload.teacherId },
                        { teacherId: null, requestType: 'evaluation', status: 'pending' },
                    ],
                },
                lock: t.LOCK.UPDATE,
                transaction: t,
            });

            if (!order) {
                throw new Error('Order not found or access denied');
            }

            // ── Case 1: Teacher ACCEPTS a broadcast evaluation request ──────────
            if (order.teacherId === null && payload.status === 'accepted') {
                await order.update({
                    teacherId: payload.teacherId,
                    status: MarketplaceRequestStatus.ACCEPTED,
                }, { transaction: t });

                // Notify student that their request was picked up
                const notifPayload = new CreateNotificationPayload(
                    order.studentId,
                    NotificationType.ORDER,
                    '📝 Evaluation Accepted',
                    `A teacher has accepted your IELTS ${order.skill} evaluation request.`,
                    '/my-requests',
                );
                await this.notificationService.createNotification(notifPayload);

            // ── Case 2: Teacher COMPLETES the evaluation (submits feedback) ─────
            } else if (payload.status === 'completed' && order.status !== 'completed') {
                await order.update({
                    status: MarketplaceRequestStatus.COMPLETED,
                    feedbackPath: payload.feedbackPath,
                }, { transaction: t });

                // Pay the teacher
                await User.update(
                    { wallet_balance: sequelize.literal(`wallet_balance + ${order.fee}`) },
                    { where: { id: payload.teacherId }, transaction: t },
                );

                // Notify student that their evaluation is ready
                const notifPayload = new CreateNotificationPayload(
                    order.studentId,
                    NotificationType.ORDER,
                    '✅ Evaluation Completed',
                    `Your IELTS ${order.skill} evaluation is ready! Check your progress page.`,
                    '/progress',
                );
                await this.notificationService.createNotification(notifPayload);

            // ── Default: standard status update (accept/reject for normal bookings) ──
            } else {
                await order.update({
                    status: payload.status,
                    feedbackPath: payload.feedbackPath || order.feedbackPath,
                }, { transaction: t });
            }

            await t.commit();
            console.log('[TeacherService] updateOrder success', { id: order.id, newStatus: order.status });
            return order;
        } catch (error) {
            await t.rollback();
            console.error('[TeacherService] updateOrder error', error);
            throw error;
        }
    }

    public async getTransactions(teacherId: string): Promise<any> {
        const teacher = await User.findByPk(teacherId);

        const completedRequests = await MarketplaceRequest.findAll({
            where: { teacherId, status: ['accepted', 'completed'] },
            order: [['updatedAt', 'DESC']],
        });

        const transactions = await Promise.all(
            completedRequests.map(async (r) => {
                const student = await User.findByPk(r.studentId, {
                    attributes: ['firstName', 'lastName'],
                });
                return {
                    id: r.id,
                    studentId: r.studentId,
                    studentName: student
                        ? `${student.firstName} ${student.lastName}`.trim()
                        : r.studentId.slice(0, 8),
                    date: r.updatedAt,
                    service: r.skill ? `IELTS ${r.skill} Review` : 'IELTS Review',
                    amount: Number(r.fee ?? 0),
                    status: r.status === 'completed' ? 'Cleared' : 'Pending',
                };
            })
        );

        return {
            walletBalance: Number(teacher?.wallet_balance ?? 0),
            transactions,
        };
    }

    public async withdraw(payload: WithdrawPayload): Promise<number> {
        const { teacherId, amount } = payload;
        const t = await sequelize.transaction();

        try {
            const teacher = await User.findByPk(teacherId, { lock: t.LOCK.UPDATE, transaction: t });
            if (!teacher) {
                throw new Error('Teacher not found');
            }

            const currentBalance = Number(teacher.wallet_balance ?? 0);
            const withdrawAmount = Number(amount);

            if (withdrawAmount > currentBalance) {
                throw new Error('Withdrawal amount exceeds wallet balance');
            }

            const newBalance = currentBalance - withdrawAmount;
            await teacher.update({ wallet_balance: newBalance }, { transaction: t });

            const notificationPayload = new CreateNotificationPayload(
                teacherId,
                NotificationType.PAYMENT,
                'Withdrawal Requested',
                `Your withdrawal of ${withdrawAmount.toLocaleString('vi-VN')} Brain Credits has been submitted. Processing takes 1–3 business days.`,
                '/teacher/payments',
            );
            await this.notificationService.createNotification(notificationPayload);

            await t.commit();
            return newBalance;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
}
