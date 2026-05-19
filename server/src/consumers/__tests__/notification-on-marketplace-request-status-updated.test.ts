import { NotificationOnMarketplaceRequestStatusUpdatedConsumer } from '../notification-on-marketplace-request-status-updated';
import { IQueueProvider } from '../../services/queue/IQueueProvider';
import { INotificationService } from '../../services/notificationService';
import { QueueTopic } from '../../types/queue/queue.types';
import { CreateNotificationPayload, NotificationType } from '../../types/notification';
import { IUserService } from '../../services/userService';

describe('NotificationOnMarketplaceRequestStatusUpdatedConsumer', () => {
    let consumer: NotificationOnMarketplaceRequestStatusUpdatedConsumer;
    let mockQueueProvider: jest.Mocked<IQueueProvider>;
    let mockNotificationService: jest.Mocked<INotificationService>;
    let mockUserService: jest.Mocked<IUserService>;

    const mockRequest = {
        id: 'req-123',
        studentId: 'student-456',
        teacherId: 'teacher-789',
        status: 'accepted',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockTeacher = {
        id: 'teacher-789',
        firstName: 'John',
        lastName: 'Doe',
    };

    beforeEach(() => {
        mockQueueProvider = {
            consume: jest.fn(),
            publish: jest.fn(),
        } as any;

        mockUserService = {
            getUserById: jest.fn(),
        } as any;

        mockNotificationService = {
            createNotification: jest.fn(),
        } as any;

        consumer = new NotificationOnMarketplaceRequestStatusUpdatedConsumer(
            mockQueueProvider,
            mockNotificationService,
            mockUserService,
        );

        jest.clearAllMocks();
    });

    it('should subscribe to MARKETPLACE_REQUEST_STATUS_UPDATED topic', async () => {
        await consumer.consume();
        expect(mockQueueProvider.consume).toHaveBeenCalledWith(
            QueueTopic.MARKETPLACE_REQUEST_STATUS_UPDATED,
            'notifications',
            expect.any(Function),
        );
    });

    describe('message handling', () => {
        let messageHandler: Function;

        beforeEach(async () => {
            await consumer.consume();
            messageHandler = mockQueueProvider.consume.mock.calls[0][2];
        });

        it('should create a notification when status is accepted', async () => {
            mockUserService.getUserById.mockResolvedValue(mockTeacher as any);

            await messageHandler({ data: { ...mockRequest, status: 'accepted' } });

            expect(mockUserService.getUserById).toHaveBeenCalledWith('teacher-789');
            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'student-456',
                    type: NotificationType.MARKETPLACE,
                    title: '🎉 Request Accepted!',
                    body: 'John Doe has accepted your review request. Check your requests page.',
                    linkPath: '/my-requests',
                })
            );
        });

        it('should create a notification when status is completed', async () => {
            mockUserService.getUserById.mockResolvedValue(mockTeacher as any);

            await messageHandler({ data: { ...mockRequest, status: 'completed' } });

            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: '✅ Review Completed',
                    body: 'John Doe has completed your IELTS review. Your feedback is ready!',
                })
            );
        });

        it('should create a notification when status is rejected', async () => {
            mockUserService.getUserById.mockResolvedValue(mockTeacher as any);

            await messageHandler({ data: { ...mockRequest, status: 'rejected' } });

            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Request Declined',
                    body: 'John Doe was unable to accept your request. Try another tutor.',
                })
            );
        });

        it('should use "a teacher" if teacher details are missing', async () => {
            mockUserService.getUserById.mockResolvedValue(null);

            await messageHandler({ data: { ...mockRequest, status: 'accepted' } });

            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: 'a teacher has accepted your review request. Check your requests page.',
                })
            );
        });

        it('should ignore unknown statuses', async () => {
            await messageHandler({ data: { ...mockRequest, status: 'pending' } });

            expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
        });

        it('should throw error if user service fails', async () => {
            const error = new Error('User Service Error');
            mockUserService.getUserById.mockRejectedValue(error);

            await expect(messageHandler({ data: mockRequest })).rejects.toThrow(error);
        });

        it('should throw error if notification service fails', async () => {
            mockUserService.getUserById.mockResolvedValue(mockTeacher as any);
            const error = new Error('Notification Service Error');
            mockNotificationService.createNotification.mockRejectedValue(error);

            await expect(messageHandler({ data: mockRequest })).rejects.toThrow(error);
        });
    });
});
