import Notification from '../models/Notification';
import { CreateNotificationPayload, NotificationItem } from '../types/notification';

export interface INotificationService {
    createNotification(payload: CreateNotificationPayload): Promise<void>;
    getNotifications(userId: string): Promise<{ notifications: NotificationItem[], unreadCount: number }>;
    markAllAsRead(userId: string): Promise<void>;
}

export class NotificationService implements INotificationService {
    public async createNotification(payload: CreateNotificationPayload): Promise<void> {
        console.log('[NotificationService] createNotification called', payload);
        const { userId, type, title, body, linkPath, isRead } = payload;
        await Notification.create({
            userId: userId,
            type: type,
            title: title,
            body: body,
            linkPath: linkPath,
            isRead: isRead,
        });
    }

    public async getNotifications(userId: string): Promise<{ notifications: NotificationItem[], unreadCount: number }> {
        console.log('[NotificationService] getNotifications called', { userId });
        const dbNotifications = await Notification.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit: 50,
        });

        const notifications = dbNotifications.map(n => ({
            id: `db-${n.id}`,
            type: n.type,
            title: n.title,
            body: n.body,
            linkPath: n.linkPath,
            isRead: n.isRead,
            createdAt: n.createdAt,
        }));

        const unreadCount = notifications.filter((n) => !n.isRead).length;
        return { notifications, unreadCount };
    }

    public async markAllAsRead(userId: string): Promise<void> {
        console.log('[NotificationService] markAllAsRead called', { userId });
        await Notification.update(
            { isRead: true },
            { where: { userId, isRead: false } }
        );
    }
}
