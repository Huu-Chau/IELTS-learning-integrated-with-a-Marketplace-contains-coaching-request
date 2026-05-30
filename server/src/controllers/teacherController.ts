import { Request, Response, NextFunction } from 'express';
import { ITeacherService } from '../services/teacherService';
import { IMessageService } from '../services/messageService';
import { INotificationService } from '../services/notificationService';
import { CreateListingPayload, UpdateListingPayload, UpdateOrderPayload, WithdrawPayload, UpdateAvailabilityRulesPayload } from '../types/teacher';
import { CreateMessagePayload } from '../types/message';
import { MessageService } from '../services/messageService';

export interface ITeacherController {
    getStats(req: Request, res: Response, next: NextFunction): Promise<void>;
    getListings(req: Request, res: Response, next: NextFunction): Promise<void>;
    createListing(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateListing(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteListing(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAvailability(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateAvailability(req: Request, res: Response, next: NextFunction): Promise<void>;
    getOrders(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateOrder(req: Request, res: Response, next: NextFunction): Promise<void>;
    getTransactions(req: Request, res: Response, next: NextFunction): Promise<void>;
    withdraw(req: Request, res: Response, next: NextFunction): Promise<void>;
    getConversations(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMessages(req: Request, res: Response, next: NextFunction): Promise<void>;
    sendMessage(req: Request, res: Response, next: NextFunction): Promise<void>;
    getNotifications(req: Request, res: Response, next: NextFunction): Promise<void>;
    markNotificationsAsRead(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class TeacherController implements ITeacherController {
    constructor(
        private readonly teacherService: ITeacherService,
        private readonly messageService: IMessageService,
        private readonly notificationService: INotificationService
    ) {}

    public async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const teacherId = req.user!.uid;
            const stats = await this.teacherService.getStats(teacherId);
            res.json(stats);
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async getListings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const teacherId = req.user!.uid;
            const listings = await this.teacherService.getListings(teacherId);
            res.json(listings);
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async createListing(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { title, description, skills, pricePerHour, sessionDuration } = req.body;
            if (!title || !description || !skills || !pricePerHour) {
                res.status(400).json({ error: 'title, description, skills, and pricePerHour are required' });
                return;
            }

            const payload = new CreateListingPayload(
                title,
                description,
                Array.isArray(skills) ? skills : [skills],
                parseFloat(pricePerHour),
                sessionDuration ?? 60,
                req.user!.uid
            );

            const listing = await this.teacherService.createListing(payload);
            res.status(201).json(listing);
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async updateListing(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const payload = new UpdateListingPayload(
                id,
                req.body.title,
                req.body.description,
                req.body.skills,
                req.body.pricePerHour ? parseFloat(req.body.pricePerHour) : undefined,
                req.body.sessionDuration,
                req.body.isActive,
                req.user!.uid
            );

            const listing = await this.teacherService.updateListing(payload);
            res.json(listing);
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async deleteListing(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const teacherId = req.user!.uid;
            const success = await this.teacherService.deleteListing(id, teacherId);

            if (!success) {
                res.status(404).json({ error: 'Listing not found or access denied' });
                return;
            }

            res.json({ message: 'Listing deleted' });
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const teacherId = req.user!.uid;
            const rules = await this.teacherService.getAvailability(teacherId);
            res.json(rules);
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async updateAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const teacherId = req.user!.uid;
            const { rules } = req.body;

            if (!Array.isArray(rules)) {
                res.status(400).json({ error: 'rules must be an array' });
                return;
            }

            const payload = new UpdateAvailabilityRulesPayload(teacherId, rules);
            const updated = await this.teacherService.updateAvailabilityRules(payload);
            res.json(updated);
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const teacherId = req.user!.uid;
            const orders = await this.teacherService.getOrders(teacherId);
            res.json(orders);
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async updateOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { status, feedbackPath } = req.body;
            const payload = new UpdateOrderPayload(
                id,
                req.user!.uid,
                status,
                feedbackPath
            );

            const order = await this.teacherService.updateOrder(payload);
            res.json(order);
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const teacherId = req.user!.uid;
            const data = await this.teacherService.getTransactions(teacherId);
            res.json(data);
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const teacherId = req.user!.uid;
            const { amount } = req.body;

            if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
                res.status(400).json({ error: 'A valid positive amount is required' });
                return;
            }

            const payload = new WithdrawPayload(teacherId, Number(amount));
            const newBalance = await this.teacherService.withdraw(payload);

            // Notify the teacher's notification page in real-time
            const io = req.app.get('io');
            if (io) {
                io.to(teacherId).emit('new_notification');
            }

            res.json({ success: true, newBalance });
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user!.uid;
            const conversations = await this.messageService.getConversations(userId);
            res.json(conversations);
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user!.uid;
            const { conversationId } = req.params;
            const messages = await this.messageService.getMessages(conversationId, userId);
            res.json(messages);
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
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
                type
            );
            const message = await this.messageService.createMessage(payload);

            const io = req.app.get('io');
            if (io) {
                io.to(receiverId).emit('new_message', message);
                io.to(senderId).emit('new_message', message);
            }

            res.status(201).json(message);
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user!.uid;
            const result = await this.notificationService.getNotifications(userId);
            res.json(result.notifications);
            return next();
        } catch (error) {
            next(error);
        }
    }

    public async markNotificationsAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user!.uid;
            await this.notificationService.markAllAsRead(userId);
            res.json({ message: 'All notifications marked as read' });
            return next();
        } catch (error) {
            next(error);
        }
    }
}
