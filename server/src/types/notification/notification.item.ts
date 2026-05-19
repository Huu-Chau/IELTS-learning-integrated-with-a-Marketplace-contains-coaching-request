export interface NotificationItem {
    id: string;
    type: string;
    title: string;
    body: string;
    linkPath: string | null;
    isRead: boolean;
    createdAt: Date;
}
