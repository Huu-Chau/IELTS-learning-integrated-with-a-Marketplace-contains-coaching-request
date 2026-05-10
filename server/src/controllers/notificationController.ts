import { Request, Response, NextFunction } from 'express';
import { INotificationService } from '../services/notificationService';

export interface INotificationController {
    getNotifications(req: Request, res: Response, next: NextFunction): Promise<void>;
    markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class NotificationController implements INotificationController {
    constructor(private notificationService: INotificationService) { }

    public async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
        console.log('[NotificationController] getNotifications called', { uid: req.user?.uid });
        try {
            const userId = req.user!.uid;
            const result = await this.notificationService.getNotifications(userId);
            
            console.log('[NotificationController] getNotifications success', {
                total: result.notifications.length,
                unread: result.unreadCount,
            });

            res.json(result);
            return next();
        } catch (error: any) {
            console.error('[NotificationController] getNotifications error', error);
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }

    public async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
        console.log('[NotificationController] markAllAsRead called', { uid: req.user?.uid });
        try {
            const userId = req.user!.uid;
            await this.notificationService.markAllAsRead(userId);
            
            console.log('[NotificationController] markAllAsRead success');
            res.json({ message: 'All notifications marked as read' });
            return next();
        } catch (error: any) {
            console.error('[NotificationController] markAllAsRead error', error);
            res.status(500).json({ error: 'Failed to mark notifications as read' });
        }
    }
}
