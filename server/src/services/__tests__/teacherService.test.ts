import { TeacherService } from '../teacherService';
import TeacherListing from '../../models/TeacherListing';
import MarketplaceRequest from '../../models/MarketplaceRequest';
import User from '../../models/User';
import Notification from '../../models/Notification';
import Message from '../../models/Message';
import TeacherAvailability from '../../models/TeacherAvailability';
import sequelize from '../../config/database';
import { INotificationService } from '../notificationService';

jest.mock('../../models/TeacherListing', () => ({
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
    update: jest.fn()
}));
jest.mock('../../models/MarketplaceRequest', () => ({
    count: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn()
}));
jest.mock('../../models/User', () => ({
    findByPk: jest.fn(),
    update: jest.fn()
}));
jest.mock('../../models/Notification', () => ({
    count: jest.fn(),
    create: jest.fn()
}));
jest.mock('../../models/Message', () => ({
    count: jest.fn()
}));
jest.mock('../../models/TeacherAvailability', () => ({
    findAll: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn()
}));
jest.mock('../../config/database', () => ({
    transaction: jest.fn()
}));

describe('TeacherService', () => {
    let teacherService: TeacherService;
    let mockNotificationService: jest.Mocked<INotificationService>;

    beforeEach(() => {
        mockNotificationService = {
            createNotification: jest.fn(),
            getNotifications: jest.fn(),
            getUnreadCount: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn()
        } as any;

        teacherService = new TeacherService(mockNotificationService);
        jest.clearAllMocks();
    });

    describe('getStats', () => {
        it('should return teacher statistics', async () => {
            const teacherId = 'teacher-123';
            (MarketplaceRequest.count as jest.Mock).mockResolvedValue(5);
            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue([
                { studentId: 'student-1' },
                { studentId: 'student-2' },
                { studentId: 'student-1' }
            ]);
            (User.findByPk as jest.Mock).mockResolvedValue({ wallet_balance: 1000 });
            (Notification.count as jest.Mock).mockResolvedValue(2);
            (Message.count as jest.Mock).mockResolvedValue(3);

            const stats = await teacherService.getStats(teacherId);

            expect(stats).toEqual({
                monthlyEarnings: 1000,
                pendingOrders: 5,
                activeStudents: 2,
                avgRating: 4.8,
                unreadNotifications: 2,
                unreadMessages: 3
            });
            expect(MarketplaceRequest.count).toHaveBeenCalledWith({
                where: { teacherId, status: 'pending' }
            });
            expect(User.findByPk).toHaveBeenCalledWith(teacherId);
        });

        it('should handle missing teacher record for wallet balance', async () => {
            const teacherId = 'teacher-123';
            (MarketplaceRequest.count as jest.Mock).mockResolvedValue(0);
            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue([]);
            (User.findByPk as jest.Mock).mockResolvedValue(null);
            (Notification.count as jest.Mock).mockResolvedValue(0);
            (Message.count as jest.Mock).mockResolvedValue(0);

            const stats = await teacherService.getStats(teacherId);

            expect(stats.monthlyEarnings).toBe(0);
        });
    });

    describe('getListings', () => {
        it('should return all listings for a teacher', async () => {
            const teacherId = 'teacher-123';
            const mockListings = [{ id: '1' }, { id: '2' }];
            (TeacherListing.findAll as jest.Mock).mockResolvedValue(mockListings);

            const result = await teacherService.getListings(teacherId);

            expect(result).toBe(mockListings);
            expect(TeacherListing.findAll).toHaveBeenCalledWith({
                where: { teacherId },
                order: [['createdAt', 'DESC']]
            });
        });
    });

    describe('createListing', () => {
        it('should create a new listing', async () => {
            const payload = {
                teacherId: 'teacher-123',
                title: 'IELTS Writing',
                description: 'Expert coaching',
                skills: ['Writing'],
                pricePerHour: 50,
                sessionDuration: 60
            };
            const mockListing = { id: 'listing-1', ...payload };
            (TeacherListing.create as jest.Mock).mockResolvedValue(mockListing);

            const result = await teacherService.createListing(payload);

            expect(result).toBe(mockListing);
            expect(TeacherListing.create).toHaveBeenCalledWith(payload);
        });
    });

    describe('updateListing', () => {
        it('should update an existing listing', async () => {
            const payload = {
                id: 'listing-1',
                teacherId: 'teacher-123',
                title: 'Updated Title'
            };
            const mockListing = {
                update: jest.fn().mockResolvedValue(true)
            };
            (TeacherListing.findOne as jest.Mock).mockResolvedValue(mockListing);

            const result = await teacherService.updateListing(payload);

            expect(result).toBe(mockListing);
            expect(TeacherListing.findOne).toHaveBeenCalledWith({
                where: { id: payload.id, teacherId: payload.teacherId }
            });
            expect(mockListing.update).toHaveBeenCalledWith({ title: 'Updated Title' });
        });

        it('should throw error if listing not found', async () => {
            (TeacherListing.findOne as jest.Mock).mockResolvedValue(null);

            await expect(teacherService.updateListing({ id: '1', teacherId: '2' }))
                .rejects.toThrow('Listing not found or access denied');
        });
    });

    describe('deleteListing', () => {
        it('should delete a listing and return true if successful', async () => {
            (TeacherListing.destroy as jest.Mock).mockResolvedValue(1);

            const result = await teacherService.deleteListing('listing-1', 'teacher-123');

            expect(result).toBe(true);
            expect(TeacherListing.destroy).toHaveBeenCalledWith({
                where: { id: 'listing-1', teacherId: 'teacher-123' }
            });
        });

        it('should return false if no listing was deleted', async () => {
            (TeacherListing.destroy as jest.Mock).mockResolvedValue(0);

            const result = await teacherService.deleteListing('listing-1', 'teacher-123');

            expect(result).toBe(false);
        });
    });

    describe('getAvailability', () => {
        it('should return teacher availability', async () => {
            const teacherId = 'teacher-123';
            const mockAvailability = [{ id: '1' }];
            (TeacherAvailability.findAll as jest.Mock).mockResolvedValue(mockAvailability);

            const result = await teacherService.getAvailability(teacherId);

            expect(result).toBe(mockAvailability);
            expect(TeacherAvailability.findAll).toHaveBeenCalledWith({
                where: { teacherId },
                order: [['date', 'ASC'], ['startTime', 'ASC']]
            });
        });
    });

    describe('updateAvailabilityRules', () => {
        let mockTransaction: any;

        beforeEach(() => {
            mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn()
            };
            (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
        });

        it('should update availability rules within a transaction', async () => {
            const teacherId = 'teacher-123';
            const rules = [
                { dayOfWeek: 1, startTime: '09:00', endTime: '10:00', date: '2023-01-01' }
            ];
            (TeacherAvailability.destroy as jest.Mock).mockResolvedValue(1);
            (TeacherAvailability.bulkCreate as jest.Mock).mockResolvedValue([]);
            (TeacherAvailability.findAll as jest.Mock).mockResolvedValue([]);

            await teacherService.updateAvailabilityRules({ teacherId, rules });

            expect(sequelize.transaction).toHaveBeenCalled();
            expect(TeacherAvailability.destroy).toHaveBeenCalledWith({
                where: { teacherId },
                transaction: mockTransaction
            });
            expect(TeacherAvailability.bulkCreate).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        teacherId,
                        startTime: '09:00',
                        date: '2023-01-01'
                    })
                ]),
                { transaction: mockTransaction }
            );
            expect(mockTransaction.commit).toHaveBeenCalled();
        });

        it('should rollback on error', async () => {
            (TeacherAvailability.destroy as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(teacherService.updateAvailabilityRules({ teacherId: '1', rules: [] }))
                .rejects.toThrow('DB Error');

            expect(mockTransaction.rollback).toHaveBeenCalled();
            expect(mockTransaction.commit).not.toHaveBeenCalled();
        });
    });

    describe('getOrders', () => {
        it('should return mapped orders with student details', async () => {
            const teacherId = 'teacher-123';
            const mockOrders = [
                { id: 'o1', studentId: 's1', status: 'pending', fee: 50, skill: 'Writing', createdAt: new Date() }
            ];
            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue(mockOrders);
            (User.findByPk as jest.Mock).mockResolvedValue({ firstName: 'John', lastName: 'Doe' });

            const result = await teacherService.getOrders(teacherId);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(expect.objectContaining({
                id: 'o1',
                studentName: 'John Doe',
                fee: 50
            }));
            expect(User.findByPk).toHaveBeenCalledWith('s1', expect.any(Object));
        });

        it('should handle missing student record in orders', async () => {
            const teacherId = 'teacher-123';
            const mockOrders = [{ id: 'o1', studentId: 's1-verylongid', status: 'pending' }];
            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue(mockOrders);
            (User.findByPk as jest.Mock).mockResolvedValue(null);

            const result = await teacherService.getOrders(teacherId);

            expect(result[0].studentName).toBe('s1-veryl');
        });
    });

    describe('updateOrder', () => {
        let mockTransaction: any;

        beforeEach(() => {
            mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn(),
                LOCK: { UPDATE: 'UPDATE' }
            };
            (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
        });

        it('should update order status', async () => {
            const payload = { id: 'o1', teacherId: 't1', status: 'rejected' as any };
            const mockOrder = {
                teacherId: 't1',
                status: 'pending',
                update: jest.fn().mockResolvedValue(true)
            };
            (MarketplaceRequest.findOne as jest.Mock).mockResolvedValue(mockOrder);

            const result = await teacherService.updateOrder(payload);

            expect(result).toBe(mockOrder);
            expect(mockOrder.update).toHaveBeenCalledWith(
                { status: 'rejected' },
                { transaction: mockTransaction }
            );
            expect(mockTransaction.commit).toHaveBeenCalled();
        });

        it('should throw error if order not found', async () => {
            (MarketplaceRequest.findOne as jest.Mock).mockResolvedValue(null);

            await expect(teacherService.updateOrder({ id: '1', teacherId: '2', status: 'accepted' as any }))
                .rejects.toThrow('Order not found or access denied');
            expect(mockTransaction.rollback).toHaveBeenCalled();
        });
    });

    describe('getTransactions', () => {
        it('should return wallet balance and transactions', async () => {
            const teacherId = 'teacher-123';
            (User.findByPk as jest.Mock).mockImplementation((id, options) => {
                if (id === teacherId && !options) return Promise.resolve({ wallet_balance: 1000 });
                return Promise.resolve({ firstName: 'Jane', lastName: 'Doe' });
            });
            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue([
                { id: 'r1', studentId: 's1', status: 'completed', fee: 100, skill: 'Reading', updatedAt: new Date() }
            ]);

            const result = await teacherService.getTransactions(teacherId);

            expect(result.walletBalance).toBe(1000);
            expect(result.transactions).toHaveLength(1);
            expect(result.transactions[0]).toEqual(expect.objectContaining({
                studentName: 'Jane Doe',
                amount: 100,
                status: 'Cleared'
            }));
        });
    });

    describe('withdraw', () => {
        let mockTransaction: any;

        beforeEach(() => {
            mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn(),
                LOCK: { UPDATE: 'UPDATE' }
            };
            (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
        });

        it('should process withdrawal successfully', async () => {
            const payload = { teacherId: 't1', amount: 500 };
            const mockTeacher = {
                wallet_balance: 1000,
                update: jest.fn().mockResolvedValue(true)
            };
            (User.findByPk as jest.Mock).mockResolvedValue(mockTeacher);

            const newBalance = await teacherService.withdraw(payload);

            expect(newBalance).toBe(500);
            expect(mockTeacher.update).toHaveBeenCalledWith({ wallet_balance: 500 }, { transaction: mockTransaction });
            expect(mockNotificationService.createNotification).toHaveBeenCalled();
            expect(mockTransaction.commit).toHaveBeenCalled();
        });

        it('should throw error if insufficient balance', async () => {
            const payload = { teacherId: 't1', amount: 1500 };
            const mockTeacher = { wallet_balance: 1000 };
            (User.findByPk as jest.Mock).mockResolvedValue(mockTeacher);

            await expect(teacherService.withdraw(payload)).rejects.toThrow('Withdrawal amount exceeds wallet balance');
            expect(mockTransaction.rollback).toHaveBeenCalled();
        });

        it('should throw error if teacher not found', async () => {
            (User.findByPk as jest.Mock).mockResolvedValue(null);

            await expect(teacherService.withdraw({ teacherId: '1', amount: 100 }))
                .rejects.toThrow('Teacher not found');
            expect(mockTransaction.rollback).toHaveBeenCalled();
        });
    });
});
