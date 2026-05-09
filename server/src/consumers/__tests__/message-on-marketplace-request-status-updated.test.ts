import { MessageOnMarketplaceRequestStatusUpdatedConsumer } from '../message-on-marketplace-request-status-updated';
import { IQueueProvider } from '../../services/queue/IQueueProvider';
import { IMessageService, MessageService } from '../../services/messageService';
import { QueueTopic, QueueMessage } from '../../types/queue';
import { IMarketplaceRequestAttributes } from '../../models/MarketplaceRequest';
import { MarketplaceRequestStatus } from '../../types/marketplace-request';
import { CreateMessagePayload, MessageType } from '../../types/message';

describe('MessageOnMarketplaceRequestStatusUpdatedConsumer', () => {
    let mockQueueService: jest.Mocked<IQueueProvider>;
    let mockMessageService: jest.Mocked<IMessageService>;
    let consumer: MessageOnMarketplaceRequestStatusUpdatedConsumer;
    
    beforeEach(() => {
        mockQueueService = {
            publish: jest.fn(),
            consume: jest.fn(),
            connect: jest.fn(),
            disconnect: jest.fn()
        } as unknown as jest.Mocked<IQueueProvider>;

        mockMessageService = {
            createMessage: jest.fn()
        };

        consumer = new MessageOnMarketplaceRequestStatusUpdatedConsumer(mockQueueService, mockMessageService);
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('consume()', () => {
        it('should call queueService.consume with correct topic and group', async () => {
            await consumer.consume();
            expect(mockQueueService.consume).toHaveBeenCalledWith(
                QueueTopic.MARKETPLACE_REQUEST_STATUS_UPDATED,
                'message',
                expect.any(Function)
            );
        });
        
        describe('message handler', () => {
            let handler: (message: QueueMessage<IMarketplaceRequestAttributes>) => Promise<void>;
            
            beforeEach(async () => {
                await consumer.consume();
                handler = mockQueueService.consume.mock.calls[0][2] as any;
            });
            
            it('should do nothing if status is not ACCEPTED', async () => {
                const message = new QueueMessage({ status: MarketplaceRequestStatus.PENDING } as IMarketplaceRequestAttributes);
                
                await handler(message);
                expect(mockMessageService.createMessage).not.toHaveBeenCalled();
            });

            it('should log a warning and return if teacherId is missing on ACCEPTED status', async () => {
                const message = new QueueMessage({ status: MarketplaceRequestStatus.ACCEPTED, studentId: 'stu-1' } as IMarketplaceRequestAttributes);
                
                await handler(message);
                expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('has no teacherId'));
                expect(mockMessageService.createMessage).not.toHaveBeenCalled();
            });

            it('should create a message if request is ACCEPTED and teacherId is present', async () => {
                const message = new QueueMessage({ 
                    status: MarketplaceRequestStatus.ACCEPTED, 
                    teacherId: 'teacher-1', 
                    studentId: 'student-1',
                    skill: 'Speaking'
                } as IMarketplaceRequestAttributes);
                
                await handler(message);
                
                const expectedConversationId = MessageService.buildConversationId('teacher-1', 'student-1');
                
                expect(mockMessageService.createMessage).toHaveBeenCalledTimes(1);
                const payloadArg = mockMessageService.createMessage.mock.calls[0][0];
                expect(payloadArg).toBeInstanceOf(CreateMessagePayload);
                expect(payloadArg.conversationId).toBe(expectedConversationId);
                expect(payloadArg.senderId).toBe('teacher-1');
                expect(payloadArg.receiverId).toBe('student-1');
                expect(payloadArg.content).toContain('Speaking');
                expect(payloadArg.type).toBe(MessageType.TEXT);
            });

            it('should use default skill label if skill is not provided', async () => {
                const message = new QueueMessage({ 
                    status: MarketplaceRequestStatus.ACCEPTED, 
                    teacherId: 'teacher-1', 
                    studentId: 'student-1'
                } as IMarketplaceRequestAttributes);
                
                await handler(message);
                
                const payloadArg = mockMessageService.createMessage.mock.calls[0][0];
                expect(payloadArg.content).toContain('your session');
            });

            it('should log error and throw if createMessage fails', async () => {
                mockMessageService.createMessage.mockRejectedValue(new Error('DB Error'));
                
                const message = new QueueMessage({ 
                    status: MarketplaceRequestStatus.ACCEPTED, 
                    teacherId: 'teacher-1', 
                    studentId: 'student-1'
                } as IMarketplaceRequestAttributes);
                
                await expect(handler(message)).rejects.toThrow('DB Error');
                expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to create message:'), expect.any(Error));
            });
        });
    });
});
