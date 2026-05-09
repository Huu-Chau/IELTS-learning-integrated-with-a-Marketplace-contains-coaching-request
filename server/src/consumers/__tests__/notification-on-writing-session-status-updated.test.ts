import { NotificationOnWritingSessionStatusUpdatedConsumer } from '../notification-on-writing-session-status-updated';
import { IQueueProvider } from '../../services/queue/IQueueProvider';
import { INotificationService } from '../../services/notificationService';
import { WritingSessionStatus } from '../../types/writing-session';
import { NotificationType } from '../../types/notification';
import { QueueTopic } from '../../types/queue';

describe('NotificationOnWritingSessionStatusUpdatedConsumer', () => {
    let consumer: NotificationOnWritingSessionStatusUpdatedConsumer;
    let mockQueueService: jest.Mocked<IQueueProvider>;
    let mockNotificationService: jest.Mocked<INotificationService>;

    beforeEach(() => {
        mockQueueService = {
            consume: jest.fn(),
            publish: jest.fn(),
        } as any;

        mockNotificationService = {
            createNotification: jest.fn(),
        } as any;

        consumer = new NotificationOnWritingSessionStatusUpdatedConsumer(
            mockQueueService,
            mockNotificationService
        );
    });

    it('should register a consumer for the WRITING_SESSION_STATUS_UPDATED topic', async () => {
        await consumer.consume();

        expect(mockQueueService.consume).toHaveBeenCalledWith(
            QueueTopic.WRITING_SESSION_STATUS_UPDATED,
            'notifications',
            expect.any(Function)
        );
    });

    describe('when a message is received', () => {
        let messageHandler: (message: any) => Promise<void>;

        beforeEach(async () => {
            await consumer.consume();
            messageHandler = mockQueueService.consume.mock.calls[0][2];
        });

        it('should create a notification when session status is COMPLETED', async () => {
            const mockSession = {
                id: 'session-123',
                userId: 'user-456',
                status: WritingSessionStatus.COMPLETED,
                book: 'Cambridge 18',
                testNumber: 1
            };

            await messageHandler({ data: mockSession });

            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-456',
                    type: NotificationType.SYSTEM,
                    title: 'Writing Evaluation Complete 🎉',
                    body: expect.stringContaining('Cambridge 18 Test 1'),
                    linkPath: '/progress'
                })
            );
        });

        it('should NOT create a notification for other statuses', async () => {
            const mockSession = {
                id: 'session-123',
                userId: 'user-456',
                status: 'IN_PROGRESS' as any,
                book: 'Cambridge 18',
                testNumber: 1
            };

            await messageHandler({ data: mockSession });

            expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
        });

        it('should throw an error and log if notification creation fails', async () => {
            const mockSession = {
                id: 'session-123',
                userId: 'user-456',
                status: WritingSessionStatus.COMPLETED,
                book: 'Cambridge 18',
                testNumber: 1
            };

            const error = new Error('Failed to create notification');
            mockNotificationService.createNotification.mockRejectedValue(error);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await expect(messageHandler({ data: mockSession })).rejects.toThrow(error);
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });
});
