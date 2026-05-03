import Notification from '../models/Notification';
import { CreateNotificationPayload } from '../types/notification';

export interface INotificationService {
    createNotification(payload: CreateNotificationPayload): Promise<void>;
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
}
