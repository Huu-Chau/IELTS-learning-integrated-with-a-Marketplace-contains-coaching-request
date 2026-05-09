import request from 'supertest';
import express from 'express';

// Mock service variables (must be prefixed with 'mock')
var mockCreateMessage = jest.fn();
var mockBuildConversationId = jest.fn();

jest.mock('../../services/messageService', () => {
    return {
        MessageService: jest.fn().mockImplementation(() => ({
            createMessage: mockCreateMessage,
        })),
    };
});

// Mock middleware
jest.mock('../../middleware/authMiddleware', () => ({
    verifyToken: () => (req: any, res: any, next: any) => {
        req.user = { uid: 'user123' };
        next();
    },
}));

// Mock models
jest.mock('../../models/Message', () => ({
    findAll: jest.fn(),
    update: jest.fn(),
}));

jest.mock('../../models/User', () => ({
    findByPk: jest.fn(),
}));

import router from '../messageRoutes';
import Message from '../../models/Message';
import User from '../../models/User';
import { MessageService } from '../../services/messageService';
import { CreateMessagePayload } from '../../types/message';

// Since MessageService is a class, we need to attach the static method to the mocked constructor
(MessageService.buildConversationId as unknown as jest.Mock) = mockBuildConversationId;

// Mock payload
jest.mock('../../types/message', () => ({
    CreateMessagePayload: jest.fn().mockImplementation((conversationId, senderId, receiverId, content, type) => ({
        conversationId,
        senderId,
        receiverId,
        content,
        type,
    })),
}));

const app = express();
app.use(express.json());
// Mock io
const mockIo = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
};
app.set('io', mockIo);
app.use('/api/messages', router);

describe('MessageRoutes', () => {
    const userId = 'user123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/messages/conversations', () => {
        it('should return a list of enriched conversations', async () => {
            const mockMessages = [
                {
                    conversationId: 'conv1',
                    senderId: userId,
                    receiverId: 'other1',
                    content: 'Hello',
                    sentAt: new Date(),
                    isRead: true,
                },
                {
                    conversationId: 'conv1',
                    senderId: 'other1',
                    receiverId: userId,
                    content: 'Hi',
                    sentAt: new Date(),
                    isRead: false,
                },
            ];

            (Message.findAll as jest.Mock).mockResolvedValue(mockMessages);
            (User.findByPk as jest.Mock).mockImplementation((id) => {
                if (id === 'other1') {
                    return Promise.resolve({
                        id: 'other1',
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'john@example.com',
                    });
                }
                return Promise.resolve(null);
            });

            const response = await request(app).get('/api/messages/conversations');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0]).toMatchObject({
                conversationId: 'conv1',
                otherId: 'other1',
                unreadCount: 1,
                otherUser: {
                    id: 'other1',
                    name: 'John Doe',
                    email: 'john@example.com',
                },
            });
        });

        it('should return 500 if database query fails', async () => {
            (Message.findAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

            const response = await request(app).get('/api/messages/conversations');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to fetch conversations');
        });
    });

    describe('GET /api/messages/:conversationId', () => {
        it('should return messages for a conversation and mark them as read', async () => {
            const conversationId = 'conv1';
            const mockMessages = [
                { id: 1, content: 'Test', conversationId },
            ];

            (Message.findAll as jest.Mock).mockResolvedValue(mockMessages);
            (Message.update as jest.Mock).mockResolvedValue([1]);

            const response = await request(app).get(`/api/messages/${conversationId}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockMessages);
            expect(Message.update).toHaveBeenCalledWith(
                { isRead: true },
                { where: { conversationId, receiverId: userId, isRead: false } }
            );
        });

        it('should return 500 if database query fails', async () => {
            (Message.findAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

            const response = await request(app).get('/api/messages/conv1');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to fetch messages');
        });
    });

    describe('POST /api/messages/send/:receiverId', () => {
        const receiverId = 'other1';
        const content = 'Test message';

        it('should send a message and emit socket event', async () => {
            const mockMessage = { id: 'msg123', content, senderId: userId, receiverId };
            const conversationId = 'user123_other1';

            mockBuildConversationId.mockReturnValue(conversationId);
            mockCreateMessage.mockResolvedValue(mockMessage);

            const response = await request(app)
                .post(`/api/messages/send/${receiverId}`)
                .send({ content });

            expect(response.status).toBe(201);
            expect(response.body).toEqual(mockMessage);
            expect(mockIo.to).toHaveBeenCalledWith(receiverId);
            expect(mockIo.to).toHaveBeenCalledWith(userId);
            expect(mockIo.emit).toHaveBeenCalledWith('new_message', mockMessage);
        });

        it('should return 400 if content is missing', async () => {
            const response = await request(app)
                .post(`/api/messages/send/${receiverId}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('content is required');
        });

        it('should return 500 if message creation fails', async () => {
            mockBuildConversationId.mockReturnValue('conv1');
            mockCreateMessage.mockRejectedValue(new Error('Service Error'));

            const response = await request(app)
                .post(`/api/messages/send/${receiverId}`)
                .send({ content });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to send message');
        });
    });
});
