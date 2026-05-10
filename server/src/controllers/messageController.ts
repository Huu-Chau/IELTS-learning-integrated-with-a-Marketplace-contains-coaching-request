import { Request, Response, NextFunction } from 'express';
import { IMessageService, MessageService } from '../services/messageService';
import { CreateMessagePayload } from '../types/message';

export interface IMessageController {
    getConversations(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMessages(req: Request, res: Response, next: NextFunction): Promise<void>;
    sendMessage(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class MessageController implements IMessageController {

    constructor(readonly messageService: IMessageService) {
    }

    public getConversations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[MessageController] GET /conversations called', { uid: req.user?.uid });
        try {
            const userId = req.user!.uid;
            const conversations = await this.messageService.getConversations(userId);

            console.log('[MessageController] GET /conversations success', { count: conversations.length });
            res.json(conversations);
            return next();
        } catch (error) {
            console.error('[MessageController] GET /conversations error', error);
            return next(error);
        }
    };

    public getMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[MessageController] GET /:conversationId called', { id: req.params.conversationId });
        try {
            const userId = req.user!.uid;
            const { conversationId } = req.params;
            const messages = await this.messageService.getMessages(conversationId, userId);

            console.log('[MessageController] GET /:conversationId success', { count: messages.length });
            res.json(messages);
            return next();
        } catch (error) {
            console.error('[MessageController] GET /:conversationId error', error);
            return next(error);
        }
    };

    public sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[MessageController] POST /send/:receiverId called', { receiverId: req.params.receiverId });
        try {
            const senderId = req.user!.uid;
            const { receiverId } = req.params;
            const { content, type = 'text' } = req.body;

            if (!content) {
                res.status(400).json({ error: 'content is required' });
                return;
            }

            const conversationId = MessageService.buildConversationId(senderId, receiverId);

            const payload = new CreateMessagePayload(
                conversationId,
                senderId,
                receiverId,
                content,
                type,
            );
            const message = await this.messageService.createMessage(payload);

            // Emit new message event to the receiver's room, and the sender's room
            const io = req.app.get('io');
            if (io) {
                io.to(receiverId).emit('new_message', message);
                io.to(senderId).emit('new_message', message);
            }

            console.log('[MessageController] POST /send/:receiverId success', { id: message.id });
            res.status(201).json(message);
            return next();
        } catch (error) {
            console.error('[MessageController] POST /send/:receiverId error', error);
            return next(error);
        }
    };
}
