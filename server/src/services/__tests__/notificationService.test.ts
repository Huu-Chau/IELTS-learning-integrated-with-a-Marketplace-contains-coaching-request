import { NotificationService } from '../notificationService';
import Notification from '../../models/Notification';
import { NotificationType } from '../../types/notification/notification-types';

jest.mock('../../models/Notification');

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    const mockPayload = {
      userId: 'user123',
      type: NotificationType.SYSTEM,
      title: 'Test Notification',
      body: 'This is a test notification body',
      linkPath: '/notifications/123',
      isRead: false,
    };

    it('should create a notification successfully', async () => {
      (Notification.create as jest.Mock).mockResolvedValue({ id: 'notif123', ...mockPayload });

      await notificationService.createNotification(mockPayload);

      expect(Notification.create).toHaveBeenCalledWith({
        userId: mockPayload.userId,
        type: mockPayload.type,
        title: mockPayload.title,
        body: mockPayload.body,
        linkPath: mockPayload.linkPath,
        isRead: mockPayload.isRead,
      });
    });

    it('should throw an error if Notification.create fails', async () => {
      const error = new Error('Database Error');
      (Notification.create as jest.Mock).mockRejectedValue(error);

      await expect(notificationService.createNotification(mockPayload)).rejects.toThrow('Database Error');
    });
  });
});
