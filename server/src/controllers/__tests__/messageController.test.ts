import { Request, Response, NextFunction } from 'express';
import { MessageController } from '../messageController';
import { IMessageService, MessageService } from '../../services/messageService';
import { CreateMessagePayload } from '../../types/message';

jest.mock('../../services/messageService');

describe('MessageController', () => {
    let controller: MessageController;
    let mockMessageService: jest.Mocked<IMessageService>;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;
    let emitMock: jest.Mock;
    let toMock: jest.Mock;
    let mockIo: any;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        emitMock = jest.fn();
        toMock = jest.fn().mockReturnValue({ emit: emitMock });
        mockIo = { to: toMock };

        mockReq = {
            user: { uid: 'user-123' } as any,
            params: {},
            body: {},
            app: {
                get: jest.fn().mockReturnValue(mockIo)
            } as any
        };

        mockRes = {
            status: statusMock,
            json: jsonMock,
        } as any;

        mockNext = jest.fn();

        mockMessageService = {
            getConversations: jest.fn(),
            getMessages: jest.fn(),
            createMessage: jest.fn(),
        } as any;

        // Mock static method
        (MessageService.buildConversationId as jest.Mock) = jest.fn().mockReturnValue('user-123_receiver-456');

        controller = new MessageController(mockMessageService);
        jest.clearAllMocks();
    });

    describe('getConversations', () => {
        it('should return conversations and call next()', async () => {
            const mockConversations = [{ conversationId: 'c1', lastMessage: 'hi' }];
            mockMessageService.getConversations.mockResolvedValue(mockConversations);

            await controller.getConversations(mockReq as Request, mockRes as Response, mockNext);

            expect(mockMessageService.getConversations).toHaveBeenCalledWith('user-123');
            expect(jsonMock).toHaveBeenCalledWith(mockConversations);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle errors via next(error)', async () => {
            const error = new Error('Service Error');
            mockMessageService.getConversations.mockRejectedValue(error);

            await controller.getConversations(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getMessages', () => {
        it('should return messages and call next()', async () => {
            const mockMessages = [{ id: 1, content: 'hi' }];
            mockReq.params = { conversationId: 'c1' };
            mockMessageService.getMessages.mockResolvedValue(mockMessages as any);

            await controller.getMessages(mockReq as Request, mockRes as Response, mockNext);

            expect(mockMessageService.getMessages).toHaveBeenCalledWith('c1', 'user-123');
            expect(jsonMock).toHaveBeenCalledWith(mockMessages);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle errors via next(error)', async () => {
            const error = new Error('Service Error');
            mockReq.params = { conversationId: 'c1' };
            mockMessageService.getMessages.mockRejectedValue(error);

            await controller.getMessages(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('sendMessage', () => {
        it('should send a message, emit to socket, and return 201', async () => {
            const mockMessage = { id: 1, content: 'hello', senderId: 'user-123', receiverId: 'receiver-456' };
            mockReq.params = { receiverId: 'receiver-456' };
            mockReq.body = { content: 'hello' };
            mockMessageService.createMessage.mockResolvedValue(mockMessage as any);

            await controller.sendMessage(mockReq as Request, mockRes as Response, mockNext);

            expect(MessageService.buildConversationId).toHaveBeenCalledWith('user-123', 'receiver-456');
            expect(mockMessageService.createMessage).toHaveBeenCalledWith(expect.any(CreateMessagePayload));
            expect(mockIo.to).toHaveBeenCalledWith('receiver-456');
            expect(mockIo.to).toHaveBeenCalledWith('user-123');
            expect(emitMock).toHaveBeenCalledWith('new_message', mockMessage);
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith(mockMessage);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 400 if content is missing', async () => {
            mockReq.params = { receiverId: 'receiver-456' };
            mockReq.body = {};

            await controller.sendMessage(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'content is required' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle errors via next(error)', async () => {
            const error = new Error('Creation Error');
            mockReq.params = { receiverId: 'receiver-456' };
            mockReq.body = { content: 'hello' };
            mockMessageService.createMessage.mockRejectedValue(error);

            await controller.sendMessage(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
