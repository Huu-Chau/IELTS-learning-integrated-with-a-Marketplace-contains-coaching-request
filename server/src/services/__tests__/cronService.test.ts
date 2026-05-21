import cron from 'node-cron';
import { Op } from 'sequelize';

// Mock variables for notification service
const mockCreateNotification = jest.fn();

// Mocks must be defined before imports that use them
jest.mock('node-cron');
jest.mock('../../models/MarketplaceRequest', () => ({
    findAll: jest.fn(),
    update: jest.fn(),
}));
jest.mock('../../models/User', () => ({
    findByPk: jest.fn(),
    increment: jest.fn(),
}));
jest.mock('../../config/database', () => ({
    transaction: jest.fn((callback) => callback('mock-transaction')),
    literal: jest.fn((str) => str),
}));
jest.mock('../../models/Reservation', () => ({
    findAll: jest.fn(),
    update: jest.fn(),
}));
jest.mock('../../models/TeacherAvailability', () => ({
    update: jest.fn(),
    destroy: jest.fn(),
}));
jest.mock('../../services/notificationService', () => ({
    NotificationService: jest.fn().mockImplementation(() => ({
        createNotification: mockCreateNotification,
    })),
}));
jest.mock('../../types/notification', () => ({
    CreateNotificationPayload: jest.fn().mockImplementation((userId, type, title, message, link) => ({
        userId, type, title, message, link
    })),
    NotificationType: {
        PAYMENT: 'PAYMENT',
        ORDER: 'ORDER'
    }
}));

import MarketplaceRequest from '../../models/MarketplaceRequest';
import User from '../../models/User';
import sequelize from '../../config/database';
import Reservation from '../../models/Reservation';
import TeacherAvailability from '../../models/TeacherAvailability';
import { NotificationService } from '../../services/notificationService';
import { MarketplaceRequestStatus } from '../../types/marketplace-request';
import { 
    autoCompleteSessions, 
    autoRejectStaleRequests, 
    sendSessionReminders, 
    expireReservations,
    startAllJobs,
    autocleanPastAvailabilities
} from '../cronService';

describe('CronService', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    describe('autoCompleteSessions', () => {
        it('should auto-complete overdue sessions and credit teachers', async () => {
            const mockRequest = {
                id: 'req-1',
                teacherId: 'teacher-1',
                studentId: 'student-1',
                fee: '100',
                update: jest.fn().mockResolvedValue([1]),
            };

            const mockTeacher = {
                id: 'teacher-1',
                increment: jest.fn().mockResolvedValue([1]),
            };

            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue([mockRequest]);
            (User.findByPk as jest.Mock).mockResolvedValue(mockTeacher);

            await autoCompleteSessions();

            expect(MarketplaceRequest.findAll).toHaveBeenCalled();
            expect(mockRequest.update).toHaveBeenCalledWith(
                { status: MarketplaceRequestStatus.COMPLETED },
                { transaction: 'mock-transaction' }
            );
            expect(User.findByPk).toHaveBeenCalledWith('teacher-1', { transaction: 'mock-transaction' });
            expect(mockTeacher.increment).toHaveBeenCalledWith('wallet_balance', { 
                by: 100, 
                transaction: 'mock-transaction' 
            });
            expect(mockCreateNotification).toHaveBeenCalledTimes(2);
        });

        it('should skip if no overdue sessions are found', async () => {
            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue([]);
            await autoCompleteSessions();
            expect(sequelize.transaction).not.toHaveBeenCalled();
        });
    });

    describe('autoRejectStaleRequests', () => {
        it('should auto-reject stale pending requests and refund students', async () => {
            const mockRequest = {
                id: 'req-2',
                studentId: 'student-2',
                fee: '50',
                update: jest.fn().mockResolvedValue([1]),
            };

            const mockStudent = {
                id: 'student-2',
                increment: jest.fn().mockResolvedValue([1]),
            };

            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue([mockRequest]);
            (User.findByPk as jest.Mock).mockResolvedValue(mockStudent);

            await autoRejectStaleRequests();

            expect(MarketplaceRequest.findAll).toHaveBeenCalled();
            expect(mockRequest.update).toHaveBeenCalledWith(
                { status: MarketplaceRequestStatus.REJECTED },
                { transaction: 'mock-transaction' }
            );
            expect(User.findByPk).toHaveBeenCalledWith('student-2', { transaction: 'mock-transaction' });
            expect(mockStudent.increment).toHaveBeenCalledWith('wallet_balance', { 
                by: 50, 
                transaction: 'mock-transaction' 
            });
            expect(mockCreateNotification).toHaveBeenCalled();
        });
    });

    describe('sendSessionReminders', () => {
        it('should send reminders for upcoming sessions', async () => {
            const mockRequest = {
                id: 'req-3',
                studentId: 'student-3',
                teacherId: 'teacher-3',
            };

            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue([mockRequest]);

            await sendSessionReminders();

            expect(MarketplaceRequest.findAll).toHaveBeenCalled();
            expect(mockCreateNotification).toHaveBeenCalledTimes(2);
        });
    });

    describe('expireReservations', () => {
        it('should expire abandoned reservations and free up slots', async () => {
            const mockReservation = {
                id: 'res-1',
                availabilityId: 'avail-1',
                update: jest.fn().mockResolvedValue([1]),
            };

            (Reservation.findAll as jest.Mock).mockResolvedValue([mockReservation]);

            await expireReservations();

            expect(Reservation.findAll).toHaveBeenCalled();
            expect(mockReservation.update).toHaveBeenCalledWith(
                { status: 'expired' },
                { transaction: 'mock-transaction' }
            );
            expect(TeacherAvailability.update).toHaveBeenCalledWith(
                { isAvailable: true },
                { where: { id: 'avail-1' }, transaction: 'mock-transaction' }
            );
        });

        it('should skip if no expired reservations found', async () => {
            (Reservation.findAll as jest.Mock).mockResolvedValue([]);
            await expireReservations();
            expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('expired reservation'));
        });
    });

    describe('startAllJobs', () => {
        it('should schedule all cron jobs', () => {
            startAllJobs();
            expect(cron.schedule).toHaveBeenCalledTimes(5);
        });
    });

    describe('autocleanPastAvailabilities', () => {
        it('should delete stale past availability slots', async () => {
            (TeacherAvailability.destroy as jest.Mock).mockResolvedValue(3);
            await autocleanPastAvailabilities();
            expect(TeacherAvailability.destroy).toHaveBeenCalledWith({
                where: {
                    date: { [Op.lt]: expect.any(Date) },
                    isAvailable: true,
                },
            });
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('autocleanPastAvailabilities success'), { deletedCount: 3 });
        });
    });
});
