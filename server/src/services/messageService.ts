import Message from '../models/Message';
import { CreateMessagePayload } from '../types/message';

export interface IMessageService {
    createMessage(payload: CreateMessagePayload): Promise<Message>;
}

export class MessageService implements IMessageService {
    public async createMessage(payload: CreateMessagePayload): Promise<Message> {
        const message = await Message.create({
            conversationId: payload.conversationId,
            senderId: payload.senderId,
            receiverId: payload.receiverId,
            content: payload.content,
            type: payload.type,
        });
        return message;
    }

    public static buildConversationId(user1Id: string, user2Id: string): string {
        return [user1Id, user2Id].sort().join('_');
    }
}
