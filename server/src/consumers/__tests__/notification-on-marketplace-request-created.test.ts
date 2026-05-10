import { NotificationOnMarketplaceRequestCreatedConsumer } from '../notification-on-marketplace-request-created';
import { IQueueProvider } from '../../services/queue/IQueueProvider';
import { INotificationService } from '../../services/notificationService';
import { QueueMessage, QueueTopic } from '../../types/queue/queue.types';
import { MarketplaceRequestStatus } from '../../types/marketplace-request';
import { NotificationType } from '../../types/notification';
import { IUserService } from '../../services/userService';

describe('NotificationOnMarketplaceRequestCreatedConsumer', () => {
    let consumer: NotificationOnMarketplaceRequestCreatedConsumer;
    let mockQueueService: jest.Mocked<IQueueProvider>;
    let mockNotificationService: jest.Mocked<INotificationService>;
    let mockUserService: jest.Mocked<IUserService>;
    let queueCallback: (message: QueueMessage<any>) => Promise<void>;

    beforeEach(() => {
        mockUserService = {
            getUserById: jest.fn(),
        } as any;
        mockQueueService = {
            publish: jest.fn(),
            consume: jest.fn().mockImplementation((topic, groupId, callback) => {
                queueCallback = callback;
                return Promise.resolve();
            }),
            connect: jest.fn(),
            disconnect: jest.fn()
        } as unknown as jest.Mocked<IQueueProvider>;

        mockNotificationService = {
            createNotification: jest.fn(),
            getNotificationsByUser: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn()
        } as unknown as jest.Mocked<INotificationService>;

        consumer = new NotificationOnMarketplaceRequestCreatedConsumer(
            mockQueueService,
            mockNotificationService,
            mockUserService
        );

        jest.clearAllMocks();
    });

    describe('consume setup', () => {
        it('should correctly subscribe to MARKETPLACE_REQUEST_CREATED topic', async () => {
            await consumer.consume();
            
            expect(mockQueueService.consume).toHaveBeenCalledWith(
                QueueTopic.MARKETPLACE_REQUEST_CREATED,
                'notifications',
                expect.any(Function)
            );
        });
    });

    describe('processing messages', () => {
        const createMockMessage = (status: MarketplaceRequestStatus, skill?: string) => ({
            id: 'msg-123',
            topic: QueueTopic.MARKETPLACE_REQUEST_CREATED,
            timestamp: new Date(),
            data: {
                id: 'req-1',
                studentId: 'student-1',
                teacherId: 'teacher-1',
                status,
                fee: 1000000,
                skill
            } as any
        });

        beforeEach(async () => {
            await consumer.consume();
        });

        it('should successfully create notifications for PENDING status', async () => {
            const mockTeacher = { id: 'teacher-1', firstName: 'John', lastName: 'Doe' };
            const mockStudent = { id: 'student-1', firstName: 'Jane', lastName: 'Smith' };
            
            mockUserService.getUserById
                .mockResolvedValueOnce(mockTeacher as any)
                .mockResolvedValueOnce(mockStudent as any);

            const message = createMockMessage(MarketplaceRequestStatus.PENDING, 'Writing');
            await queueCallback(message);

            expect(mockUserService.getUserById).toHaveBeenCalledWith('teacher-1');
            expect(mockUserService.getUserById).toHaveBeenCalledWith('student-1');

            expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(2);

            // Verify Student Notification
            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'student-1',
                    type: NotificationType.MARKETPLACE,
                    title: 'Review Request Pending',
                    body: expect.stringContaining('John Doe'),
                    linkPath: '/my-requests',
                })
            );

            // Verify Teacher Notification
            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'teacher-1',
                    type: NotificationType.ORDER,
                    title: '🛎️ New Booking Request',
                    body: expect.stringContaining('Jane Smith'),
                    linkPath: '/teacher/marketplace',
                })
            );
        });

        it('should successfully create notifications for ACCEPTED status', async () => {
            const mockTeacher = { id: 'teacher-1', firstName: 'Alice', lastName: 'Teacher' };
            const mockStudent = { id: 'student-1', firstName: 'Bob', lastName: 'Student' };
            
            mockUserService.getUserById
                .mockResolvedValueOnce(mockTeacher as any)
                .mockResolvedValueOnce(mockStudent as any);

            const message = createMockMessage(MarketplaceRequestStatus.ACCEPTED);
            await queueCallback(message);

            expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(2);

            // Verify Student Notification
            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'student-1',
                    type: NotificationType.PAYMENT,
                    title: '🎉 Booking Confirmed!',
                    body: expect.stringContaining('Alice Teacher'),
                    linkPath: '/my-requests',
                })
            );

            // Verify Teacher Notification
            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'teacher-1',
                    type: NotificationType.ORDER,
                    title: '🛎️ New Session Booked!',
                    body: expect.stringContaining('Bob Student'),
                    linkPath: '/teacher/marketplace',
                })
            );
        });

        it('should handle missing teacher and student gracefully (default names)', async () => {
            mockUserService.getUserById
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null);

            const message = createMockMessage(MarketplaceRequestStatus.PENDING);
            await queueCallback(message);

            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'student-1',
                    body: expect.stringContaining('a teacher'),
                })
            );

            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'teacher-1',
                    body: expect.stringContaining('a student'),
                })
            );
        });

        it('should not create notifications for other statuses', async () => {
            const message = createMockMessage(MarketplaceRequestStatus.REJECTED);
            await queueCallback(message);

            expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
        });

        it('should throw error if userService fails', async () => {
            const error = new Error('Database Error');
            mockUserService.getUserById.mockRejectedValueOnce(error);

            const message = createMockMessage(MarketplaceRequestStatus.PENDING);

            await expect(queueCallback(message)).rejects.toThrow('Database Error');
        });

        it('should throw error if notificationService fails', async () => {
            mockUserService.getUserById
                .mockResolvedValueOnce({} as any)
                .mockResolvedValueOnce({} as any);
            
            const error = new Error('Notification Error');
            mockNotificationService.createNotification.mockRejectedValueOnce(error);

            const message = createMockMessage(MarketplaceRequestStatus.PENDING);

            await expect(queueCallback(message)).rejects.toThrow('Notification Error');
        });
    });
});
