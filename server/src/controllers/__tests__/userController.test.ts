import { Request, Response, NextFunction } from 'express';
import { UserController } from '../userController';
import { IUserService } from '../../services/userService';
import { Role } from '../../types/auth';

describe('UserController', () => {
    let userController: UserController;
    let mockUserService: jest.Mocked<IUserService>;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        mockUserService = {
            getUserById: jest.fn(),
            updateUser: jest.fn(),
            getAllUsers: jest.fn(),
            setUserRole: jest.fn(),
            topUp: jest.fn(),
        } as any;

        userController = new UserController(mockUserService);

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
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('getMe', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockReq.user = undefined;
            await userController.getMe(mockReq as Request, mockRes as Response, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Not authenticated' });
        });

        it('should return req.dbUser if available', async () => {
            mockReq.dbUser = { id: 'test-uid', name: 'Test User' } as any;
            await userController.getMe(mockReq as Request, mockRes as Response, mockNext);
            expect(jsonMock).toHaveBeenCalledWith(mockReq.dbUser);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 404 if user not found', async () => {
            mockUserService.getUserById.mockResolvedValue(null);
            await userController.getMe(mockReq as Request, mockRes as Response, mockNext);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'User profile not found' });
        });

        it('should return user profile if found', async () => {
            const mockUser = { id: 'test-uid', name: 'Test User' } as any;
            mockUserService.getUserById.mockResolvedValue(mockUser);
            await userController.getMe(mockReq as Request, mockRes as Response, mockNext);
            expect(jsonMock).toHaveBeenCalledWith(mockUser);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should pass error to next on service error', async () => {
            const error = new Error('DB Error');
            mockUserService.getUserById.mockRejectedValue(error);
            await userController.getMe(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getById', () => {
        it('should return 404 if user not found', async () => {
            mockReq.params = { uid: 'test-uid' };
            mockUserService.getUserById.mockResolvedValue(null);
            await userController.getById(mockReq as Request, mockRes as Response, mockNext);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'User not found' });
        });

        it('should return user profile if found', async () => {
            mockReq.params = { uid: 'test-uid' };
            const mockUser = { id: 'test-uid', name: 'Test User' } as any;
            mockUserService.getUserById.mockResolvedValue(mockUser);
            await userController.getById(mockReq as Request, mockRes as Response, mockNext);
            expect(jsonMock).toHaveBeenCalledWith(mockUser);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should pass error to next on service error', async () => {
            mockReq.params = { uid: 'test-uid' };
            const error = new Error('DB Error');
            mockUserService.getUserById.mockRejectedValue(error);
            await userController.getById(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('topUp', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockReq.user = undefined;
            await userController.topUp(mockReq as Request, mockRes as Response, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Not authenticated' });
        });

        it('should top up credits and return success', async () => {
            mockReq.body = { credits: 100 };
            mockUserService.topUp.mockResolvedValue(200);

            await userController.topUp(mockReq as Request, mockRes as Response, mockNext);

            expect(mockUserService.topUp).toHaveBeenCalledWith('test-uid', 100);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Credits successfully added', walletBalance: 200 });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should pass error to next on service error', async () => {
            mockReq.body = { credits: 100 };
            const error = new Error('DB Error');
            mockUserService.topUp.mockRejectedValue(error);
            await userController.topUp(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('update', () => {
        it('should update user and return success message', async () => {
            mockReq.params = { uid: 'test-uid' };
            mockReq.body = { name: 'Updated Name' };
            mockUserService.updateUser.mockResolvedValue(undefined);

            await userController.update(mockReq as Request, mockRes as Response, mockNext);

            expect(mockUserService.updateUser).toHaveBeenCalledWith('test-uid', expect.objectContaining({ name: 'Updated Name' }));
            expect(jsonMock).toHaveBeenCalledWith({ message: 'User updated successfully' });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should pass error to next on service error', async () => {
            mockReq.params = { uid: 'test-uid' };
            const error = new Error('Update Error');
            mockUserService.updateUser.mockRejectedValue(error);

            await userController.update(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getAll', () => {
        it('should return list of users', async () => {
            const mockUsers = [{ id: '1', name: 'User 1' }, { id: '2', name: 'User 2' }] as any;
            mockUserService.getAllUsers.mockResolvedValue(mockUsers);

            await userController.getAll(mockReq as Request, mockRes as Response, mockNext);

            expect(jsonMock).toHaveBeenCalledWith(mockUsers);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should pass error to next on service error', async () => {
            const error = new Error('Fetch Error');
            mockUserService.getAllUsers.mockRejectedValue(error);

            await userController.getAll(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('setRole', () => {
        it('should update user role and return success message', async () => {
            mockReq.params = { uid: 'test-uid' };
            mockReq.body = { role: Role.TEACHER };
            mockUserService.setUserRole.mockResolvedValue(undefined);

            await userController.setRole(mockReq as Request, mockRes as Response, mockNext);

            expect(mockUserService.setUserRole).toHaveBeenCalledWith('test-uid', Role.TEACHER);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Role updated to teacher' });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should pass error to next on service error', async () => {
            mockReq.params = { uid: 'test-uid' };
            mockReq.body = { role: Role.STUDENT };
            const error = new Error('Role Update Error');
            mockUserService.setUserRole.mockRejectedValue(error);

            await userController.setRole(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
