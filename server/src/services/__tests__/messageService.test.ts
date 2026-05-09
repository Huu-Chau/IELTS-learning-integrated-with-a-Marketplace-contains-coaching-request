import { MessageService } from '../messageService';
import Message from '../../models/Message';
import { MessageType } from '../../types/message';

jest.mock('../../models/Message');

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
