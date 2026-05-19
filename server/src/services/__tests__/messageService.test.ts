import { MessageService } from '../messageService';
import Message from '../../models/Message';
import User from '../../models/User';
import { MessageType } from '../../types/message';

jest.mock('../../models/Message');
jest.mock('../../models/User');

describe('MessageService', () => {
  let messageService: MessageService;

  beforeEach(() => {
    messageService = new MessageService();
    jest.clearAllMocks();
  });

  describe('createMessage', () => {
    const mockPayload = {
      conversationId: 'user1_user2',
      senderId: 'user1',
      receiverId: 'user2',
      content: 'Hello',
      type: MessageType.TEXT,
    };

    it('should create a message successfully', async () => {
      const mockMessage = { id: 'msg123', ...mockPayload };
      (Message.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await messageService.createMessage(mockPayload);

      expect(Message.create).toHaveBeenCalledWith({
        conversationId: mockPayload.conversationId,
        senderId: mockPayload.senderId,
        receiverId: mockPayload.receiverId,
        content: mockPayload.content,
        type: mockPayload.type,
      });
      expect(result).toEqual(mockMessage);
    });

    it('should throw an error if Message.create fails', async () => {
      const error = new Error('DB Error');
      (Message.create as jest.Mock).mockRejectedValue(error);

      await expect(messageService.createMessage(mockPayload)).rejects.toThrow('DB Error');
    });
  });

  describe('getConversations', () => {
    const userId = 'user1';

    it('should return grouped and enriched conversations', async () => {
        const mockMessages = [
            {
                conversationId: 'conv1',
                senderId: userId,
                receiverId: 'user2',
                content: 'Hello',
                sentAt: new Date('2024-01-01'),
                isRead: true,
            },
            {
                conversationId: 'conv1',
                senderId: 'user2',
                receiverId: userId,
                content: 'Hi',
                sentAt: new Date('2024-01-02'),
                isRead: false,
            },
        ];

        (Message.findAll as jest.Mock).mockResolvedValue(mockMessages);
        (User.findByPk as jest.Mock).mockResolvedValue({
            id: 'user2',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
        });

        const result = await messageService.getConversations(userId);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            conversationId: 'conv1',
            otherId: 'user2',
            unreadCount: 1,
            otherUser: {
                id: 'user2',
                name: 'John Doe',
                email: 'john@example.com',
            },
        });
    });
  });

  describe('getMessages', () => {
    it('should return messages and mark them as read', async () => {
        const conversationId = 'conv1';
        const userId = 'user1';
        const mockMessages = [{ id: 1, content: 'test' }];

        (Message.findAll as jest.Mock).mockResolvedValue(mockMessages);
        (Message.update as jest.Mock).mockResolvedValue([1]);

        const result = await messageService.getMessages(conversationId, userId);

        expect(result).toEqual(mockMessages);
        expect(Message.update).toHaveBeenCalledWith(
            { isRead: true },
            { where: { conversationId, receiverId: userId, isRead: false } }
        );
    });
  });

  describe('buildConversationId', () => {
    it('should sort IDs and join them with an underscore', () => {
      const id1 = 'abc';
      const id2 = 'xyz';
      
      expect(MessageService.buildConversationId(id1, id2)).toBe('abc_xyz');
      expect(MessageService.buildConversationId(id2, id1)).toBe('abc_xyz');
    });

    it('should handle IDs correctly to ensure consistency', () => {
      const userA = 'user_99';
      const userB = 'user_100';
      
      // 'user_100' comes before 'user_99' lexicographically
      expect(MessageService.buildConversationId(userA, userB)).toBe('user_100_user_99');
      expect(MessageService.buildConversationId(userB, userA)).toBe('user_100_user_99');
    });
  });
});
