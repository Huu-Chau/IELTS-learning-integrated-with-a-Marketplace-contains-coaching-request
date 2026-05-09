import request from 'supertest';
import express from 'express';

// Mock middleware
jest.mock('../../middleware/authMiddleware', () => ({
    verifyToken: () => (req: any, res: any, next: any) => {
        req.user = { uid: 'user123' };
        next();
    },
}));

// Mock models
jest.mock('../../models/Notification', () => ({
    findAll: jest.fn(),
    update: jest.fn(),
}));

import router from '../notificationRoutes';
import Notification from '../../models/Notification';

const app = express();
app.use(express.json());
app.use('/api/notifications', router);

describe('NotificationRoutes', () => {
    const userId = 'user123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/notifications', () => {
        it('should return a list of notifications and unread count', async () => {
            const mockDbNotifications = [
                {
                    id: 1,
                    type: 'test_type',
                    title: 'Test Title',
                    body: 'Test Body',
                    linkPath: '/test',
                    isRead: false,
                    createdAt: new Date(),
                },
                {
                    id: 2,
                    type: 'test_type_2',
                    title: 'Test Title 2',
                    body: 'Test Body 2',
                    linkPath: null,
                    isRead: true,
                    createdAt: new Date(),
                },
            ];

            (Notification.findAll as jest.Mock).mockResolvedValue(mockDbNotifications);

            const response = await request(app).get('/api/notifications');

            expect(response.status).toBe(200);
            expect(response.body.notifications).toHaveLength(2);
            expect(response.body.unreadCount).toBe(1);
            expect(response.body.notifications[0]).toMatchObject({
                id: 'db-1',
                title: 'Test Title',
                isRead: false,
            });
            expect(Notification.findAll).toHaveBeenCalledWith({
                where: { userId },
                order: [['createdAt', 'DESC']],
                limit: 50,
            });
        });

        it('should return 500 if database query fails', async () => {
            (Notification.findAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

            const response = await request(app).get('/api/notifications');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to fetch notifications');
        });
    });

    describe('PATCH /api/notifications/read-all', () => {
        it('should mark all unread notifications as read', async () => {
            (Notification.update as jest.Mock).mockResolvedValue([1]);

            const response = await request(app).patch('/api/notifications/read-all');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('All notifications marked as read');
            expect(Notification.update).toHaveBeenCalledWith(
                { isRead: true },
                { where: { userId, isRead: false } }
            );
        });

        it('should return 500 if database update fails', async () => {
            (Notification.update as jest.Mock).mockRejectedValue(new Error('DB Error'));

            const response = await request(app).patch('/api/notifications/read-all');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to mark notifications as read');
        });
    });
});
