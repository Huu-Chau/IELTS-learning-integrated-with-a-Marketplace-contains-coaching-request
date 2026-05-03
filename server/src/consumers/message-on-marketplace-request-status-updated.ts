import { IConsumer } from '.';
import { IMessageService, MessageService } from '../services/messageService';
import { IQueueProvider } from '../services/queue/IQueueProvider';
import { QueueTopic, QueueMessage } from '../types/queue';
import { IMarketplaceRequestAttributes } from '../models/MarketplaceRequest';
import { MarketplaceRequestStatus } from '../types/marketplace-request';
import { CreateMessagePayload, MessageType } from '../types/message';

export class MessageOnMarketplaceRequestStatusUpdatedConsumer implements IConsumer {
    constructor(
        private readonly queueService: IQueueProvider,
        private readonly messageService: IMessageService,
    ) { }

    private async handleRequestAccepted(request: IMarketplaceRequestAttributes): Promise<void> {
        if (!request.teacherId) {
            console.warn('[MessageConsumer] Accepted request has no teacherId, skipping message seed');
            return;
        }
        const conversationId = MessageService.buildConversationId(request.teacherId, request.studentId);
        const skillLabel = request.skill ? `IELTS ${request.skill}` : 'your session';
        const payload = new CreateMessagePayload(
            conversationId,
            request.teacherId as string,
            request.studentId,
            `Hi! I've accepted your request for ${skillLabel}. Feel free to ask me any questions or share your speaking recording here.`,
            MessageType.TEXT
        )
        await this.messageService.createMessage(payload);
        return;
    }

    public async consume(): Promise<void> {
        return this.queueService.consume(QueueTopic.MARKETPLACE_REQUEST_STATUS_UPDATED, "message", async (message: QueueMessage<IMarketplaceRequestAttributes>) => {
            const request = message.data;
            try {
                switch (request.status) {
                    case MarketplaceRequestStatus.ACCEPTED:
                        await this.handleRequestAccepted(request);
                        break;
                    default:
                        break;
                }

            } catch (err) {
                console.error(`[${MessageOnMarketplaceRequestStatusUpdatedConsumer.name}] Failed to create message:`, err);
                throw err;
            }
        })
    }
}