import { NotificationOnAttemptCreatedConsumer } from '../notification-on-attempt-created';
import { IQueueProvider } from '../../services/queue/IQueueProvider';
import { INotificationService } from '../../services/notificationService';
import { QueueTopic } from '../../types/queue';
import { CreateNotificationPayload, NotificationType } from '../../types/notification';

describe('NotificationOnAttemptCreatedConsumer', () => {
    let mockQueueService: jest.Mocked<IQueueProvider>;
    let mockNotificationService: jest.Mocked<INotificationService>;
    let consumer: NotificationOnAttemptCreatedConsumer;

    beforeEach(() => {
        mockQueueService = {
            publish: jest.fn(),
            consume: jest.fn(),
            close: jest.fn(),
            connect: jest.fn(),
        } as unknown as jest.Mocked<IQueueProvider>;

        mockNotificationService = {
            createNotification: jest.fn(),
            getNotificationsByUser: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
        } as unknown as jest.Mocked<INotificationService>;

        consumer = new NotificationOnAttemptCreatedConsumer(
            mockQueueService,
            mockNotificationService
        );
        jest.clearAllMocks();
    });

    describe('consume', () => {
        it('should call queueService.consume with correct parameters', async () => {
            await consumer.consume();

            expect(mockQueueService.consume).toHaveBeenCalledTimes(1);
            expect(mockQueueService.consume).toHaveBeenCalledWith(
                QueueTopic.ATTEMPT_CREATED,
                'notifications',
                expect.any(Function)
            );
        });

        it('should process message and create a notification (with score)', async () => {
            let consumeCallback: Function = () => {};
            mockQueueService.consume.mockImplementation(async (topic, groupId, callback) => {
                consumeCallback = callback;
            });

            await consumer.consume();

            const message = {
                data: {
                    id: '123',
                    userId: 'user-1',
                    type: 'reading',
                    score: 7.5,
                }
            };

            await consumeCallback(message);

            expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(1);
            const expectedPayload = new CreateNotificationPayload(
                'user-1',
                NotificationType.ATTEMPT,
                'Reading Test Completed · Band 7.5',
                'Your reading mock test result has been saved to your progress.',
                '/progress'
            );
            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(expectedPayload);
        });

        it('should process message and create a notification (without score)', async () => {
            let consumeCallback: Function = () => {};
            mockQueueService.consume.mockImplementation(async (topic, groupId, callback) => {
                consumeCallback = callback;
            });

            await consumer.consume();

            const message = {
                data: {
                    id: '124',
                    userId: 'user-2',
                    type: 'writing',
                    score: null,
                }
            };

            await consumeCallback(message);

            expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(1);
            const expectedPayload = new CreateNotificationPayload(
                'user-2',
                NotificationType.ATTEMPT,
                'Writing Test Completed',
                'Your writing mock test result has been saved to your progress.',
                '/progress'
            );
            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(expectedPayload);
        });

        it('should log error and re-throw if createNotification fails', async () => {
            let consumeCallback: Function = () => {};
            mockQueueService.consume.mockImplementation(async (topic, groupId, callback) => {
                consumeCallback = callback;
            });

            await consumer.consume();

            const message = {
                data: {
                    id: '125',
                    userId: 'user-3',
                    type: 'listening',
                    score: 8.0,
                }
            };

            const error = new Error('DB Error');
            mockNotificationService.createNotification.mockRejectedValue(error);
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await expect(consumeCallback(message)).rejects.toThrow('DB Error');
            expect(consoleErrorSpy).toHaveBeenCalledWith('[NotificationOnAttemptCreatedConsumer] Failed to create notification:', error);

            consoleErrorSpy.mockRestore();
        });
    });
});
