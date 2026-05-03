import { QueueMessage, QueueTopic } from '../types/queue/queue.types';
import { IQueueProvider } from '../services/queue/IQueueProvider';
import { IConsumer } from '.';
import { INotificationService } from '../services/notificationService';
import { IMarketplaceRequestAttributes } from '../models/MarketplaceRequest';
import { CreateNotificationPayload, NotificationType } from '../types/notification';
import { userService } from '../services/userService';

export class NotificationOnMarketplaceRequestCreatedConsumer implements IConsumer {
    constructor(
        private readonly queueService: IQueueProvider,
        private readonly notificationService: INotificationService,
    ) { }

    async consume(): Promise<void> {
        return this.queueService.consume(QueueTopic.MARKETPLACE_REQUEST_CREATED, "notifications", async (message: QueueMessage<IMarketplaceRequestAttributes>) => {
            console.log('[NotificationOnMarketplaceRequestCreatedConsumer] 🚀 Message received in consumer', message);
            const request = message.data;
            try {
                const teacher = request.teacherId ? await userService.getUserById(request.teacherId) : null;
                const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : 'a teacher';
                const payload = new CreateNotificationPayload(
                    request.studentId,
                    NotificationType.MARKETPLACE,
                    'Review Request Pending',
                    `Your expert review request is waiting. We'll notify you when ${teacherName} responds.`,
                    '/my-requests',
                    false,
                );
                await this.notificationService.createNotification(payload);
            } catch (err) {
                console.error('[NotificationOnMarketplaceRequestCreatedConsumer] Failed to create notification:', err);
                throw err;
            }
        })
    }
}