import { QueueMessage, QueueTopic } from '../types/queue/queue.types';
import { IQueueProvider } from '../services/queue/IQueueProvider';
import { IConsumer } from '.';
import { INotificationService } from '../services/notificationService';
import { IMarketplaceRequestAttributes } from '../models/MarketplaceRequest';
import { CreateNotificationPayload, NotificationType } from '../types/notification';
import { userService } from '../services/userService';

export class NotificationOnMarketplaceRequestStatusUpdatedConsumer implements IConsumer {
    constructor(
        private readonly queueService: IQueueProvider,
        private readonly notificationService: INotificationService,
    ) { }

    async consume(): Promise<void> {
        return this.queueService.consume(QueueTopic.MARKETPLACE_REQUEST_STATUS_UPDATED, "notifications", async (message: QueueMessage<IMarketplaceRequestAttributes>) => {
            console.log(`[${NotificationOnMarketplaceRequestStatusUpdatedConsumer.name}] 🚀 Message received in consumer`, message);
            const request = message.data;
            try {
                const teacher = request.teacherId ? await userService.getUserById(request.teacherId) : null;
                const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : 'a teacher';

                const statusMessages: Record<string, { title: string; body: string }> = {
                    accepted: {
                        title: '🎉 Request Accepted!',
                        body: `${teacherName} has accepted your review request. Check your requests page.`,
                    },
                    completed: {
                        title: '✅ Review Completed',
                        body: `${teacherName} has completed your IELTS review. Your feedback is ready!`,
                    },
                    rejected: {
                        title: 'Request Declined',
                        body: `${teacherName} was unable to accept your request. Try another tutor.`,
                    },
                };

                const msg = statusMessages[request.status];
                if (!msg) {
                    return;
                }
                const payload = new CreateNotificationPayload(
                    request.studentId,
                    NotificationType.MARKETPLACE,
                    msg.title,
                    msg.body,
                    '/my-requests',
                );
                await this.notificationService.createNotification(payload);
            } catch (err) {
                console.error(`[${NotificationOnMarketplaceRequestStatusUpdatedConsumer.name}] Failed to create notification:`, err);
                throw err;
            }
        })
    }
}