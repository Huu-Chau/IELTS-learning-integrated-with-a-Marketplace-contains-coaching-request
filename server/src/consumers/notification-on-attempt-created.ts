import { QueueMessage, QueueTopic } from "../types/queue";
import { IQueueProvider } from '../services/queue/IQueueProvider';
import { CreateNotificationPayload, NotificationType } from '../types/notification';
import { INotificationService } from '../services/notificationService';
import { IAttemptAttributes } from '../models/Attempt';
import { IConsumer } from '.';

export class NotificationOnAttemptCreatedConsumer implements IConsumer {
    constructor(
        private readonly queueService: IQueueProvider,
        private readonly notificationService: INotificationService,
    ) { }

    async consume(): Promise<void> {
        return this.queueService.consume(QueueTopic.ATTEMPT_CREATED, "notifications", async (message: QueueMessage<IAttemptAttributes>) => {
            console.log('[NotificationOnAttemptCreatedConsumer] 🚀 Message received in consumer', message);
            const attempt = message.data;
            try {
                const typeLabel = attempt.type.charAt(0).toUpperCase() + attempt.type.slice(1);
                const scoreStr = attempt.score ? ` · Band ${attempt.score.toFixed(1)}` : '';
                const payload = new CreateNotificationPayload(
                    attempt.userId,
                    NotificationType.ATTEMPT,
                    `${typeLabel} Test Completed${scoreStr}`,
                    `Your ${attempt.type} mock test result has been saved to your progress.`,
                    '/progress',
                );
                await this.notificationService.createNotification(payload);
            } catch (err) {
                console.error('[NotificationOnAttemptCreatedConsumer] Failed to create notification:', err);
                throw err;
            }
        })
    }
}