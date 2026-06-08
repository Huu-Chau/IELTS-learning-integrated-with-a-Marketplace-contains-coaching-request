import { IConsumer } from '.';
import { IWritingSessionAttributes } from '../models/WritingSession';
import { INotificationService } from '../services/notificationService';
import { IQueueProvider } from '../services/queue/IQueueProvider';
import { CreateNotificationPayload, NotificationType } from '../types/notification';
import { QueueTopic, QueueMessage } from '../types/queue';
import { WritingSessionStatus } from '../types/writing-session';

export class NotificationOnWritingSessionStatusUpdatedConsumer implements IConsumer {
    constructor(
        private readonly queueService: IQueueProvider,
        private readonly notificationService: INotificationService,
    ) { }

    private async createNotificationForCompletedSession(session: IWritingSessionAttributes): Promise<void> {
        const payload = new CreateNotificationPayload(
            session.userId,
            NotificationType.ATTEMPT,
            `Writing Test Completed · Band ${typeof session.overallBand === 'number' ? session.overallBand.toFixed(1) : 'Partial'}`,
            `Your writing mock test result has been saved to your progress.`,
            '/progress',  // Could link directly to details if UI supports opening modal via URL
        )
        return this.notificationService.createNotification(payload);
    }

    public async consume(): Promise<void> {
        return this.queueService.consume(QueueTopic.WRITING_SESSION_STATUS_UPDATED, "notifications", async (message: QueueMessage<IWritingSessionAttributes>) => {
            const session = message.data;
            console.log(`[${NotificationOnWritingSessionStatusUpdatedConsumer.name}] 🚀 Message received in consumer`, { sessionId: session.id, status: session.status });
            try {
                switch (session.status) {
                    case WritingSessionStatus.COMPLETED:
                        await this.createNotificationForCompletedSession(session);
                        break;
                    default:
                        break;
                }
            } catch (err) {
                console.error(`[${NotificationOnWritingSessionStatusUpdatedConsumer.name}] Failed to create notification:`, err);
                throw err;
            }
        })
    }
}