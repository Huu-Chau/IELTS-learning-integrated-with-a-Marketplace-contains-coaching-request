import { NotificationType } from './notification-types';

export class CreateNotificationPayload {
    constructor(
        readonly userId: string,
        readonly type: NotificationType,
        readonly title: string,
        readonly body: string,
        readonly linkPath?: string,
        readonly isRead: boolean = false
    ) { }
}
