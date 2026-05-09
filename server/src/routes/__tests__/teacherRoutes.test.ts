// Mock sequelize transaction first to ensure it's available for model initialization if needed
jest.mock('../../config/database', () => ({
    transaction: jest.fn(() => ({
        commit: jest.fn(),
        rollback: jest.fn(),
        LOCK: { UPDATE: 'UPDATE' }
    })),
    define: jest.fn(),
    models: {},
    options: {},
    literal: jest.fn((val) => val),
}));

// Mock middleware
jest.mock('../../middleware/authMiddleware', () => ({
    verifyToken: () => (req: any, res: any, next: any) => {
        req.user = { uid: 'teacher123' };
        next();
    }
}));

// Mock models with factories to prevent execution of model files
jest.mock('../../models/TeacherListing', () => ({
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
}));
jest.mock('../../models/MarketplaceRequest', () => ({
    count: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
}));
jest.mock('../../models/User', () => ({
    findByPk: jest.fn(),
}));
jest.mock('../../models/Notification', () => ({
    count: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
}));
jest.mock('../../models/Message', () => ({
    count: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
}));
jest.mock('../../models/TeacherAvailability', () => ({
    findAll: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn(),
}));

// Mock services
const mockNotificationService = {
    createNotification: jest.fn(),
};
jest.mock('../../services/notificationService', () => ({
    NotificationService: jest.fn().mockImplementation(() => mockNotificationService),
}));

const mockMessageService = {
    createMessage: jest.fn(),
};
jest.mock('../../services/messageService', () => {
    const MessageServiceMock = jest.fn().mockImplementation(() => mockMessageService);
    (MessageServiceMock as any).buildConversationId = jest.fn();
    return {
        MessageService: MessageServiceMock,
    };
});

import request from 'supertest';
import express from 'express';
import router from '../teacherRoutes';
import TeacherListing from '../../models/TeacherListing';
import MarketplaceRequest from '../../models/MarketplaceRequest';
import User from '../../models/User';
import Notification from '../../models/Notification';
import Message from '../../models/Message';
import TeacherAvailability from '../../models/TeacherAvailability';
import { NotificationService } from '../../services/notificationService';
import { MessageService } from '../../services/messageService';
import sequelize from '../../config/database';

const app = express();
app.use(express.json());
app.use('/api/teacher', router);

describe('Teacher Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /stats', () => {
        it('should return teacher stats successfully', async () => {
            (MarketplaceRequest.count as jest.Mock).mockResolvedValue(5);
            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue([
                { studentId: 's1' },
                { studentId: 's1' },
                { studentId: 's2' }
            ]);
            (User.findByPk as jest.Mock).mockResolvedValue({ wallet_balance: 1000 });
            (Notification.count as jest.Mock).mockResolvedValue(2);
            (Message.count as jest.Mock).mockResolvedValue(3);

            const res = await request(app).get('/api/teacher/stats');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                monthlyEarnings: 1000,
                pendingOrders: 5,
                activeStudents: 2,
                avgRating: 4.8,
                unreadNotifications: 2,
                unreadMessages: 3
            });
        });

        it('should return 500 on error', async () => {
            (MarketplaceRequest.count as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const res = await request(app).get('/api/teacher/stats');
            expect(res.status).toBe(500);
        });
    });

    describe('GET /listings', () => {
        it('should return teacher listings', async () => {
            (TeacherListing.findAll as jest.Mock).mockResolvedValue([{ id: 1, title: 'IELTS Speaking' }]);

            const res = await request(app).get('/api/teacher/listings');

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0].title).toBe('IELTS Speaking');
        });
    });

    describe('POST /listings', () => {
        it('should create a new listing', async () => {
            const payload = {
                title: 'New Class',
                description: 'Description',
                skills: ['Speaking'],
                pricePerHour: 50
            };
            (TeacherListing.create as jest.Mock).mockResolvedValue({ id: 1, ...payload });

            const res = await request(app).post('/api/teacher/listings').send(payload);

            expect(res.status).toBe(201);
            expect(res.body.title).toBe('New Class');
        });

        it('should return 400 if fields are missing', async () => {
            const res = await request(app).post('/api/teacher/listings').send({ title: 'Only Title' });
            expect(res.status).toBe(400);
        });
    });

    describe('PATCH /listings/:id', () => {
        it('should update listing successfully', async () => {
            const mockListing = { id: 1, update: jest.fn().mockReturnThis() };
            (TeacherListing.findOne as jest.Mock).mockResolvedValue(mockListing);

            const res = await request(app).patch('/api/teacher/listings/1').send({ title: 'Updated' });

            expect(res.status).toBe(200);
            expect(mockListing.update).toHaveBeenCalledWith({ title: 'Updated' });
        });

        it('should return 404 if listing not found', async () => {
            (TeacherListing.findOne as jest.Mock).mockResolvedValue(null);
            const res = await request(app).patch('/api/teacher/listings/1').send({ title: 'Updated' });
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /listings/:id', () => {
        it('should delete listing successfully', async () => {
            (TeacherListing.destroy as jest.Mock).mockResolvedValue(1);
            const res = await request(app).delete('/api/teacher/listings/1');
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Listing deleted');
        });

        it('should return 404 if listing not found', async () => {
            (TeacherListing.destroy as jest.Mock).mockResolvedValue(0);
            const res = await request(app).delete('/api/teacher/listings/1');
            expect(res.status).toBe(404);
        });
    });

    describe('GET /availability', () => {
        it('should return availability rules', async () => {
            (TeacherAvailability.findAll as jest.Mock).mockResolvedValue([{ dayOfWeek: 1 }]);
            const res = await request(app).get('/api/teacher/availability');
            expect(res.status).toBe(200);
            expect(res.body[0].dayOfWeek).toBe(1);
        });
    });

    describe('PUT /availability', () => {
        it('should update availability rules', async () => {
            const rules = [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }];
            (TeacherAvailability.destroy as jest.Mock).mockResolvedValue(1);
            (TeacherAvailability.bulkCreate as jest.Mock).mockResolvedValue(rules);
            (TeacherAvailability.findAll as jest.Mock).mockResolvedValue(rules);

            const res = await request(app).put('/api/teacher/availability').send({ rules });

            expect(res.status).toBe(200);
            expect(TeacherAvailability.destroy).toHaveBeenCalled();
            expect(TeacherAvailability.bulkCreate).toHaveBeenCalled();
        });

        it('should return 400 if rules is not an array', async () => {
            const res = await request(app).put('/api/teacher/availability').send({ rules: 'not array' });
            expect(res.status).toBe(400);
        });
    });

    describe('GET /orders', () => {
        it('should return enriched orders', async () => {
            const mockOrders = [{ id: 'o1', studentId: 's1', fee: 100, createdAt: new Date() }];
            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue(mockOrders);
            (User.findByPk as jest.Mock).mockResolvedValue({ firstName: 'John', lastName: 'Doe' });

            const res = await request(app).get('/api/teacher/orders');

            expect(res.status).toBe(200);
            expect(res.body[0].studentName).toBe('John Doe');
        });
    });

    describe('PATCH /orders/:id', () => {
        it('should update order status', async () => {
            const mockOrder = { id: 'o1', update: jest.fn().mockReturnThis() };
            (MarketplaceRequest.findOne as jest.Mock).mockResolvedValue(mockOrder);

            const res = await request(app).patch('/api/teacher/orders/o1').send({ status: 'accepted' });

            expect(res.status).toBe(200);
            expect(mockOrder.update).toHaveBeenCalledWith({ status: 'accepted', feedbackPath: undefined });
        });
    });

    describe('POST /withdraw', () => {
        it('should withdraw successfully', async () => {
            const mockTeacher = { 
                wallet_balance: 1000, 
                update: jest.fn().mockResolvedValue(true) 
            };
            (User.findByPk as jest.Mock).mockResolvedValue(mockTeacher);
            mockNotificationService.createNotification.mockResolvedValue({});

            const res = await request(app).post('/api/teacher/withdraw').send({ amount: 200 });

            expect(res.status).toBe(200);
            expect(res.body.newBalance).toBe(800);
        });

        it('should return 400 for insufficient balance', async () => {
            (User.findByPk as jest.Mock).mockResolvedValue({ wallet_balance: 100 });
            const res = await request(app).post('/api/teacher/withdraw').send({ amount: 200 });
            expect(res.status).toBe(400);
        });
    });

    describe('GET /conversations', () => {
        it('should return conversations with other user info', async () => {
            const mockMessages = [
                { conversationId: 'c1', senderId: 'teacher123', receiverId: 'student1', content: 'Hi', sentAt: new Date(), isRead: true }
            ];
            (Message.findAll as jest.Mock).mockResolvedValue(mockMessages);
            (User.findByPk as jest.Mock).mockResolvedValue({ id: 'student1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' });

            const res = await request(app).get('/api/teacher/conversations');

            expect(res.status).toBe(200);
            expect(res.body[0].otherUser.name).toBe('Jane Doe');
        });
    });

    describe('POST /messages/:receiverId', () => {
        it('should send a message successfully', async () => {
            (MessageService.buildConversationId as jest.Mock).mockReturnValue('c1');
            mockMessageService.createMessage.mockResolvedValue({ id: 'm1', content: 'Hello' });

            const res = await request(app).post('/api/teacher/messages/student1').send({ content: 'Hello' });

            expect(res.status).toBe(201);
            expect(res.body.content).toBe('Hello');
        });

        it('should return 400 if content is missing', async () => {
            const res = await request(app).post('/api/teacher/messages/student1').send({});
            expect(res.status).toBe(400);
        });
    });

    describe('GET /notifications', () => {
        it('should return notifications', async () => {
            (Notification.findAll as jest.Mock).mockResolvedValue([{ id: 1, title: 'Notif' }]);
            const res = await request(app).get('/api/teacher/notifications');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });
    });

    describe('PATCH /notifications/read-all', () => {
        it('should mark all as read', async () => {
            (Notification.update as jest.Mock).mockResolvedValue([1]);
            const res = await request(app).patch('/api/teacher/notifications/read-all');
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('All notifications marked as read');
        });
    });
});
