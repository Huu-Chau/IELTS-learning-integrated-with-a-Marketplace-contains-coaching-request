import { Op } from 'sequelize';
import Message from '../models/Message';
import User from '../models/User';
import { CreateMessagePayload } from '../types/message';

export interface IMessageService {
    createMessage(payload: CreateMessagePayload): Promise<Message>;
    getConversations(userId: string): Promise<any[]>;
    getMessages(conversationId: string, userId: string): Promise<Message[]>;
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

    public async getConversations(userId: string): Promise<any[]> {
        const messages = await Message.findAll({
            where: {
                [Op.or]: [{ senderId: userId }, { receiverId: userId }],
            },
            order: [['sentAt', 'DESC']],
        });

        // Group by conversationId, pick last message per conversation
        const convMap = new Map<string, {
            conversationId: string;
            otherId: string;
            lastMessage: string;
            lastAt: Date;
            unreadCount: number;
        }>();

        for (const msg of messages) {
            const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
            if (!convMap.has(msg.conversationId)) {
                const unreadCount = messages.filter(
                    (m) => m.conversationId === msg.conversationId && m.receiverId === userId && !m.isRead
                ).length;
                convMap.set(msg.conversationId, {
                    conversationId: msg.conversationId,
                    otherId,
                    lastMessage: msg.content,
                    lastAt: msg.sentAt!,
                    unreadCount,
                });
            }
        }

        // Enrich with user display names
        const conversations = await Promise.all(
            Array.from(convMap.values()).map(async (conv) => {
                const otherUser = await User.findByPk(conv.otherId, {
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                });
                return {
                    ...conv,
                    otherUser: otherUser
                        ? { id: otherUser.id, name: `${otherUser.firstName} ${otherUser.lastName}`, email: otherUser.email }
                        : { id: conv.otherId, name: 'Unknown', email: '' },
                };
            })
        );

        // Sort by newest message
        conversations.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
        return conversations;
    }

    public async getMessages(conversationId: string, userId: string): Promise<Message[]> {
        const messages = await Message.findAll({
            where: { conversationId },
            order: [['sentAt', 'ASC']],
        });

        // Mark received messages as read
        await Message.update(
            { isRead: true },
            { where: { conversationId, receiverId: userId, isRead: false } }
        );

        return messages;
    }

    public static buildConversationId(user1Id: string, user2Id: string): string {
        return [user1Id, user2Id].sort().join('_');
    }
}
