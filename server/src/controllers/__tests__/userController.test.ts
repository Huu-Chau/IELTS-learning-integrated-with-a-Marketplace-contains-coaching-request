import { Request, Response } from 'express';
import { userController } from '../userController';
import { userService } from '../../services/userService';
import User from '../../models/User';

jest.mock('../../services/userService', () => ({
  userService: {
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    getAllUsers: jest.fn(),
    setUserRole: jest.fn(),
  },
}));

jest.mock('../../models/User', () => ({
  findByPk: jest.fn(),
}));

describe('userController', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockReq = {
            user: { uid: 'test-uid' },
            params: {},
            body: {}
        } as Partial<Request>;
        mockRes = {
            status: statusMock,
            json: jsonMock
        };
        jest.clearAllMocks();
    });

    describe('getMe', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockReq.user = undefined;
            await userController.getMe(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Not authenticated' });
        });

        it('should return req.dbUser if available', async () => {
            mockReq.dbUser = { id: 'test-uid', name: 'Test User' } as any;
            await userController.getMe(mockReq as Request, mockRes as Response);
            expect(jsonMock).toHaveBeenCalledWith(mockReq.dbUser);
        });

        it('should return 404 if user not found', async () => {
            (userService.getUserById as jest.Mock).mockResolvedValue(null);
            await userController.getMe(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'User profile not found' });
        });

        it('should return user profile if found', async () => {
            const mockUser = { id: 'test-uid', name: 'Test User' };
            (userService.getUserById as jest.Mock).mockResolvedValue(mockUser);
            await userController.getMe(mockReq as Request, mockRes as Response);
            expect(jsonMock).toHaveBeenCalledWith(mockUser);
        });

        it('should return 500 on service error', async () => {
            (userService.getUserById as jest.Mock).mockRejectedValue(new Error('DB Error'));
            await userController.getMe(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'DB Error' });
        });
    });

    describe('getById', () => {
        it('should return 404 if user not found', async () => {
            mockReq.params = { uid: 'test-uid' };
            (userService.getUserById as jest.Mock).mockResolvedValue(null);
            await userController.getById(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'User not found' });
        });

        it('should return user profile if found', async () => {
            mockReq.params = { uid: 'test-uid' };
            const mockUser = { id: 'test-uid', name: 'Test User' };
            (userService.getUserById as jest.Mock).mockResolvedValue(mockUser);
            await userController.getById(mockReq as Request, mockRes as Response);
            expect(jsonMock).toHaveBeenCalledWith(mockUser);
        });

        it('should return 500 on service error', async () => {
            mockReq.params = { uid: 'test-uid' };
            (userService.getUserById as jest.Mock).mockRejectedValue(new Error('DB Error'));
            await userController.getById(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'DB Error' });
        });
    });

    describe('topUp', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockReq.user = undefined;
            await userController.topUp(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Not authenticated' });
        });

        it('should return 400 for invalid credits amount (missing)', async () => {
            mockReq.body = {};
            await userController.topUp(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid credits amount' });
        });

        it('should return 400 for invalid credits amount (negative)', async () => {
            mockReq.body = { credits: -10 };
            await userController.topUp(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid credits amount' });
        });

        it('should return 400 for invalid credits amount (wrong type)', async () => {
            mockReq.body = { credits: '10' };
            await userController.topUp(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid credits amount' });
        });

        it('should return 404 if user not found in DB', async () => {
            mockReq.body = { credits: 100 };
            (User.findByPk as jest.Mock).mockResolvedValue(null);
            await userController.topUp(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'User not found' });
        });

        it('should top up credits and return success', async () => {
            mockReq.body = { credits: 100 };
            const mockDbUser = {
                increment: jest.fn(),
                reload: jest.fn(),
                wallet_balance: 200
            };
            (User.findByPk as jest.Mock).mockResolvedValue(mockDbUser);

            await userController.topUp(mockReq as Request, mockRes as Response);

            expect(mockDbUser.increment).toHaveBeenCalledWith('wallet_balance', { by: 100 });
            expect(mockDbUser.reload).toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Credits successfully added', walletBalance: 200 });
        });

        it('should return 500 on DB error', async () => {
            mockReq.body = { credits: 100 };
            (User.findByPk as jest.Mock).mockRejectedValue(new Error('DB Error'));
            await userController.topUp(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'DB Error' });
        });
    });

    describe('update', () => {
        it('should update user and return success message', async () => {
            mockReq.params = { uid: 'test-uid' };
            mockReq.body = { name: 'Updated Name' };
            (userService.updateUser as jest.Mock).mockResolvedValue(undefined);

            await userController.update(mockReq as Request, mockRes as Response);

            expect(userService.updateUser).toHaveBeenCalledWith('test-uid', { name: 'Updated Name' });
            expect(jsonMock).toHaveBeenCalledWith({ message: 'User updated successfully' });
        });

        it('should return 500 on service error', async () => {
            mockReq.params = { uid: 'test-uid' };
            (userService.updateUser as jest.Mock).mockRejectedValue(new Error('Update Error'));

            await userController.update(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Update Error' });
        });
    });

    describe('getAll', () => {
        it('should return list of users', async () => {
            const mockUsers = [{ id: '1', name: 'User 1' }, { id: '2', name: 'User 2' }];
            (userService.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);

            await userController.getAll(mockReq as Request, mockRes as Response);

            expect(jsonMock).toHaveBeenCalledWith(mockUsers);
        });

        it('should return 500 on service error', async () => {
            (userService.getAllUsers as jest.Mock).mockRejectedValue(new Error('Fetch Error'));

            await userController.getAll(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Fetch Error' });
        });
    });

    describe('setRole', () => {
        it('should return 400 for invalid role', async () => {
            mockReq.params = { uid: 'test-uid' };
            mockReq.body = { role: 'superadmin' };

            await userController.setRole(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid role' });
        });

        it('should update user role and return success message', async () => {
            mockReq.params = { uid: 'test-uid' };
            mockReq.body = { role: 'teacher' };
            (userService.setUserRole as jest.Mock).mockResolvedValue(undefined);

            await userController.setRole(mockReq as Request, mockRes as Response);

            expect(userService.setUserRole).toHaveBeenCalledWith('test-uid', 'teacher');
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Role updated to teacher' });
        });

        it('should return 500 on service error', async () => {
            mockReq.params = { uid: 'test-uid' };
            mockReq.body = { role: 'student' };
            (userService.setUserRole as jest.Mock).mockRejectedValue(new Error('Role Update Error'));

            await userController.setRole(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Role Update Error' });
        });
    });
});
