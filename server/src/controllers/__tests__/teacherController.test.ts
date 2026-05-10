import { Request, Response, NextFunction } from 'express';
import { TeacherController } from '../teacherController';
import { ITeacherService } from '../../services/teacherService';
import { IMessageService, MessageService } from '../../services/messageService';
import { INotificationService } from '../../services/notificationService';
import { CreateListingPayload, UpdateListingPayload, UpdateOrderPayload, WithdrawPayload, UpdateAvailabilityRulesPayload } from '../../types/teacher';
import { CreateMessagePayload } from '../../types/message';

describe('TeacherController', () => {
    let teacherController: TeacherController;
    let mockTeacherService: jest.Mocked<ITeacherService>;
    let mockMessageService: jest.Mocked<IMessageService>;
    let mockNotificationService: jest.Mocked<INotificationService>;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockTeacherService = {
            getStats: jest.fn(),
            getListings: jest.fn(),
            createListing: jest.fn(),
            updateListing: jest.fn(),
            deleteListing: jest.fn(),
            getAvailability: jest.fn(),
            updateAvailabilityRules: jest.fn(),
            getOrders: jest.fn(),
            updateOrder: jest.fn(),
            getTransactions: jest.fn(),
            withdraw: jest.fn(),
        } as any;

        mockMessageService = {
            getConversations: jest.fn(),
            getMessages: jest.fn(),
            createMessage: jest.fn(),
        } as any;

        mockNotificationService = {
            getNotifications: jest.fn(),
            markAllAsRead: jest.fn(),
            createNotification: jest.fn(),
        } as any;

        teacherController = new TeacherController(
            mockTeacherService,
            mockMessageService,
            mockNotificationService
        );

        mockReq = {
            user: { uid: 'teacher123', email: 'teacher@example.com' },
            body: {},
            params: {},
            app: { get: jest.fn() } as any,
        };

        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };

        mockNext = jest.fn();

        jest.spyOn(MessageService, 'buildConversationId').mockReturnValue('conv123');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getStats', () => {
        it('should return stats and call next', async () => {
            const stats = { monthlyEarnings: 1000 };
            mockTeacherService.getStats.mockResolvedValue(stats);

            await teacherController.getStats(mockReq as Request, mockRes as Response, mockNext);

            expect(mockTeacherService.getStats).toHaveBeenCalledWith('teacher123');
            expect(mockRes.json).toHaveBeenCalledWith(stats);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should call next with error if service fails', async () => {
            const error = new Error('Service failed');
            mockTeacherService.getStats.mockRejectedValue(error);

            await teacherController.getStats(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getListings', () => {
        it('should return listings and call next', async () => {
            const listings = [{ id: '1' }] as any;
            mockTeacherService.getListings.mockResolvedValue(listings);

            await teacherController.getListings(mockReq as Request, mockRes as Response, mockNext);

            expect(mockTeacherService.getListings).toHaveBeenCalledWith('teacher123');
            expect(mockRes.json).toHaveBeenCalledWith(listings);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('createListing', () => {
        it('should create listing and return 201', async () => {
            mockReq.body = {
                title: 'Title',
                description: 'Desc',
                skills: ['Skill'],
                pricePerHour: '50',
            };
            const listing = { id: '1' } as any;
            mockTeacherService.createListing.mockResolvedValue(listing);

            await teacherController.createListing(mockReq as Request, mockRes as Response, mockNext);

            expect(mockTeacherService.createListing).toHaveBeenCalledWith(expect.any(CreateListingPayload));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(listing);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 400 if required fields are missing', async () => {
            mockReq.body = { title: 'Title' };

            await teacherController.createListing(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: expect.any(String) });
        });
    });

    describe('updateListing', () => {
        it('should update listing and call next', async () => {
            mockReq.params = { id: '1' };
            mockReq.body = { title: 'New Title' };
            const listing = { id: '1', title: 'New Title' } as any;
            mockTeacherService.updateListing.mockResolvedValue(listing);

            await teacherController.updateListing(mockReq as Request, mockRes as Response, mockNext);

            expect(mockTeacherService.updateListing).toHaveBeenCalledWith(expect.any(UpdateListingPayload));
            expect(mockRes.json).toHaveBeenCalledWith(listing);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('deleteListing', () => {
        it('should delete listing and call next', async () => {
            mockReq.params = { id: '1' };
            mockTeacherService.deleteListing.mockResolvedValue(true);

            await teacherController.deleteListing(mockReq as Request, mockRes as Response, mockNext);

            expect(mockTeacherService.deleteListing).toHaveBeenCalledWith('1', 'teacher123');
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Listing deleted' });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 404 if listing not found', async () => {
            mockReq.params = { id: '1' };
            mockTeacherService.deleteListing.mockResolvedValue(false);

            await teacherController.deleteListing(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });
    });

    describe('getAvailability', () => {
        it('should return availability and call next', async () => {
            const availability = [] as any;
            mockTeacherService.getAvailability.mockResolvedValue(availability);

            await teacherController.getAvailability(mockReq as Request, mockRes as Response, mockNext);

            expect(mockTeacherService.getAvailability).toHaveBeenCalledWith('teacher123');
            expect(mockRes.json).toHaveBeenCalledWith(availability);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('updateAvailability', () => {
        it('should update availability and call next', async () => {
            mockReq.body = { rules: [] };
            mockTeacherService.updateAvailabilityRules.mockResolvedValue([]);

            await teacherController.updateAvailability(mockReq as Request, mockRes as Response, mockNext);

            expect(mockTeacherService.updateAvailabilityRules).toHaveBeenCalledWith(expect.any(UpdateAvailabilityRulesPayload));
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 400 if rules is not an array', async () => {
            mockReq.body = { rules: 'not array' };

            await teacherController.updateAvailability(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getOrders', () => {
        it('should return orders and call next', async () => {
            const orders = [] as any;
            mockTeacherService.getOrders.mockResolvedValue(orders);

            await teacherController.getOrders(mockReq as Request, mockRes as Response, mockNext);

            expect(mockTeacherService.getOrders).toHaveBeenCalledWith('teacher123');
            expect(mockRes.json).toHaveBeenCalledWith(orders);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('updateOrder', () => {
        it('should update order and call next', async () => {
            mockReq.params = { id: '1' };
            mockReq.body = { status: 'accepted' };
            const order = { id: '1' } as any;
            mockTeacherService.updateOrder.mockResolvedValue(order);

            await teacherController.updateOrder(mockReq as Request, mockRes as Response, mockNext);

            expect(mockTeacherService.updateOrder).toHaveBeenCalledWith(expect.any(UpdateOrderPayload));
            expect(mockRes.json).toHaveBeenCalledWith(order);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('getTransactions', () => {
        it('should return transactions and call next', async () => {
            const data = { walletBalance: 100 } as any;
            mockTeacherService.getTransactions.mockResolvedValue(data);

            await teacherController.getTransactions(mockReq as Request, mockRes as Response, mockNext);

            expect(mockTeacherService.getTransactions).toHaveBeenCalledWith('teacher123');
            expect(mockRes.json).toHaveBeenCalledWith(data);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('withdraw', () => {
        it('should withdraw and return new balance', async () => {
            mockReq.body = { amount: 100 };
            mockTeacherService.withdraw.mockResolvedValue(900);

            await teacherController.withdraw(mockReq as Request, mockRes as Response, mockNext);

            expect(mockTeacherService.withdraw).toHaveBeenCalledWith(expect.any(WithdrawPayload));
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, newBalance: 900 });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 400 for invalid amount', async () => {
            mockReq.body = { amount: -10 };

            await teacherController.withdraw(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getConversations', () => {
        it('should return conversations and call next', async () => {
            const conversations = [] as any;
            mockMessageService.getConversations.mockResolvedValue(conversations);

            await teacherController.getConversations(mockReq as Request, mockRes as Response, mockNext);

            expect(mockMessageService.getConversations).toHaveBeenCalledWith('teacher123');
            expect(mockRes.json).toHaveBeenCalledWith(conversations);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('getMessages', () => {
        it('should return messages and call next', async () => {
            mockReq.params = { conversationId: 'c1' };
            const messages = [] as any;
            mockMessageService.getMessages.mockResolvedValue(messages);

            await teacherController.getMessages(mockReq as Request, mockRes as Response, mockNext);

            expect(mockMessageService.getMessages).toHaveBeenCalledWith('c1', 'teacher123');
            expect(mockRes.json).toHaveBeenCalledWith(messages);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('sendMessage', () => {
        it('should send message and return 201', async () => {
            mockReq.params = { receiverId: 'student1' };
            mockReq.body = { content: 'Hi' };
            const message = { id: 'm1' } as any;
            mockMessageService.createMessage.mockResolvedValue(message);

            await teacherController.sendMessage(mockReq as Request, mockRes as Response, mockNext);

            expect(mockMessageService.createMessage).toHaveBeenCalledWith(expect.any(CreateMessagePayload));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(message);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 400 if content is missing', async () => {
            mockReq.params = { receiverId: 'student1' };
            mockReq.body = {};

            await teacherController.sendMessage(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getNotifications', () => {
        it('should return notifications and call next', async () => {
            const result = { notifications: [] } as any;
            mockNotificationService.getNotifications.mockResolvedValue(result);

            await teacherController.getNotifications(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNotificationService.getNotifications).toHaveBeenCalledWith('teacher123');
            expect(mockRes.json).toHaveBeenCalledWith(result.notifications);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('markNotificationsAsRead', () => {
        it('should mark as read and call next', async () => {
            mockNotificationService.markAllAsRead.mockResolvedValue(undefined);

            await teacherController.markNotificationsAsRead(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith('teacher123');
            expect(mockRes.json).toHaveBeenCalledWith({ message: expect.any(String) });
            expect(mockNext).toHaveBeenCalled();
        });
    });
});
