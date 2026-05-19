import { Request, Response, NextFunction } from 'express';
import { NotificationController } from '../notificationController';
import { INotificationService } from '../../services/notificationService';

describe('NotificationController', () => {
    let notificationController: NotificationController;
    let mockNotificationService: jest.Mocked<INotificationService>;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        mockNotificationService = {
            getNotifications: jest.fn(),
            markAllAsRead: jest.fn(),
            createNotification: jest.fn(),
        } as any;

        notificationController = new NotificationController(mockNotificationService);

        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockReq = {
            user: { uid: 'test-user-id' } as any,
        };
        mockRes = {
            status: statusMock,
            json: jsonMock,
        };
        mockNext = jest.fn();
    });

    describe('getNotifications', () => {
        it('should return notifications and call next on success', async () => {
            const mockResult = {
                notifications: [
                    {
                        id: '1',
                        type: 'info',
                        title: 'Test',
                        body: 'Body',
                        linkPath: '/',
                        isRead: false,
                        createdAt: new Date(),
                    },
                ],
                unreadCount: 1,
            };
            mockNotificationService.getNotifications.mockResolvedValue(mockResult as any);

            await notificationController.getNotifications(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNotificationService.getNotifications).toHaveBeenCalledWith('test-user-id');
            expect(jsonMock).toHaveBeenCalledWith(mockResult);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 500 when service fails', async () => {
            mockNotificationService.getNotifications.mockRejectedValue(new Error('Service Error'));

            await notificationController.getNotifications(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to fetch notifications' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all as read and call next on success', async () => {
            mockNotificationService.markAllAsRead.mockResolvedValue(undefined);

            await notificationController.markAllAsRead(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith('test-user-id');
            expect(jsonMock).toHaveBeenCalledWith({ message: 'All notifications marked as read' });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 500 when service fails', async () => {
            mockNotificationService.markAllAsRead.mockRejectedValue(new Error('Service Error'));

            await notificationController.markAllAsRead(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to mark notifications as read' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});
