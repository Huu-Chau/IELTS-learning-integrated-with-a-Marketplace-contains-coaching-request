import { Request, Response, NextFunction } from 'express';
import { auth } from '../../config/firebase';
import User from '../../models/User';
import { AuthController } from '../authController';
import { AuthService } from '../../services/authService';

// Mock dependencies
jest.mock('../../config/firebase', () => ({
  auth: {
    createUser: jest.fn(),
  },
}));

jest.mock('../../models/User', () => {
  const mockModel = {
    create: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockModel,
    ...mockModel,
  };
});

describe('authController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextMock: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let controller: AuthController;
  let service: AuthService;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    nextMock = jest.fn();
    mockReq = {
      body: {},
    };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    service = new AuthService();
    controller = new AuthController(service);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a user and sync to Postgres', async () => {
      mockReq.body = { username: 'testuser', password: 'password123', name: 'Test User', role: 'student' };

      const mockUid = 'firebase-uid-123';
      (auth.createUser as jest.Mock).mockResolvedValue({ uid: mockUid });
      (User.create as jest.Mock).mockResolvedValue({});

      await controller.register(mockReq as Request, mockRes as Response, nextMock);

      expect(auth.createUser).toHaveBeenCalledWith({
        email: 'testuser@ieltsapp.local',
        password: 'password123',
        displayName: 'Test User',
      });

      expect(User.create).toHaveBeenCalledWith({
        id: mockUid,
        email: 'testuser@ieltsapp.local',
        firstName: 'Test',
        lastName: 'User',
        role: 'student',
        wallet_balance: 0.00,
      });

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'User registered successfully.',
        uid: mockUid,
        role: 'student',
      });
      expect(nextMock).toHaveBeenCalled();
    });

    it('should return 409 if email already exists in Firebase', async () => {
      mockReq.body = { username: 'testuser', password: 'password123', role: 'student' };

      const firebaseError = new Error('Firebase error');
      (firebaseError as any).code = 'auth/email-already-exists';

      (auth.createUser as jest.Mock).mockRejectedValue(firebaseError);

      await controller.register(mockReq as Request, mockRes as Response, nextMock);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'This email/username is already in use. Please try logging in instead.' });
    });

    it('should return 500 for other errors', async () => {
      mockReq.body = { username: 'testuser', password: 'password123', role: 'student' };

      (auth.createUser as jest.Mock).mockRejectedValue(new Error('Unknown error'));

      await controller.register(mockReq as Request, mockRes as Response, nextMock);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unknown error' });
    });
  });
});
