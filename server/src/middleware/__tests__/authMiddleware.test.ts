import { Request, Response, NextFunction } from 'express';
import { verifyToken, requireAdmin, syncUser } from '../authMiddleware';
import { auth } from '../../config/firebase';
import User from '../../models/User';

// Mock dependencies
jest.mock('../../config/firebase', () => ({
  auth: {
    verifyIdToken: jest.fn()
  }
}));

jest.mock('../../models/User', () => ({
  findByPk: jest.fn(),
  create: jest.fn()
}));

describe('authMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {
      headers: {},
      method: 'GET',
      originalUrl: '/test'
    };
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should return 401 if no authorization header is provided', async () => {
      const middleware = verifyToken();
      await middleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'No token provided. Use Authorization: Bearer <token>'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token does not start with Bearer', async () => {
      mockReq.headers = { authorization: 'Basic token123' };
      const middleware = verifyToken();
      await middleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next() and attach user to req if token is valid', async () => {
      const decodedToken = {
        uid: 'user123',
        email: 'test@example.com',
        role: 'student',
        email_verified: true
      };
      (auth.verifyIdToken as jest.Mock).mockResolvedValue(decodedToken);
      mockReq.headers = { authorization: 'Bearer valid-token' };

      const middleware = verifyToken();
      await middleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(auth.verifyIdToken).toHaveBeenCalledWith('valid-token');
      expect(mockReq.user).toEqual({
        uid: 'user123',
        email: 'test@example.com',
        role: 'student',
        emailVerified: true
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 403 if requireEmailVerified is true but email is not verified', async () => {
      const decodedToken = {
        uid: 'user123',
        email: 'test@example.com',
        email_verified: false
      };
      (auth.verifyIdToken as jest.Mock).mockResolvedValue(decodedToken);
      mockReq.headers = { authorization: 'Bearer valid-token' };

      const middleware = verifyToken({ requireEmailVerified: true });
      await middleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Email verification required to access this resource.',
        code: 'EMAIL_NOT_VERIFIED'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token verification fails', async () => {
      (auth.verifyIdToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      const middleware = verifyToken();
      await middleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should call next() if user is admin', async () => {
      mockReq.user = { uid: 'admin123', email: 'admin@test.com', role: 'admin' };
      
      await requireAdmin(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 if req.user is missing', async () => {
      mockReq.user = undefined;

      await requireAdmin(mockReq as Request, mockRes as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Not authenticated' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 if user is not admin', async () => {
      mockReq.user = { uid: 'user123', email: 'user@test.com', role: 'student' };

      await requireAdmin(mockReq as Request, mockRes as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('syncUser', () => {
    it('should skip and call next() if req.user is missing', async () => {
      mockReq.user = undefined;

      await syncUser(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(User.findByPk).not.toHaveBeenCalled();
    });

    it('should attach existing user to req.dbUser and call next()', async () => {
      const dbUser = { id: 'user123', email: 'test@test.com' };
      (User.findByPk as jest.Mock).mockResolvedValue(dbUser);
      mockReq.user = { uid: 'user123', email: 'test@test.com' };

      await syncUser(mockReq as Request, mockRes as Response, nextFunction);

      expect(User.findByPk).toHaveBeenCalledWith('user123');
      expect(mockReq.dbUser).toEqual(dbUser);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should create missing user and attach to req.dbUser', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);
      const newUser = { id: 'user123', email: 'test@test.com', role: 'student' };
      (User.create as jest.Mock).mockResolvedValue(newUser);
      mockReq.user = { uid: 'user123', email: 'test@test.com', role: 'student' };

      await syncUser(mockReq as Request, mockRes as Response, nextFunction);

      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
        id: 'user123',
        email: 'test@test.com',
        role: 'student'
      }));
      expect(mockReq.dbUser).toEqual(newUser);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle database errors and return 500', async () => {
      (User.findByPk as jest.Mock).mockRejectedValue(new Error('DB error'));
      mockReq.user = { uid: 'user123', email: 'test@test.com' };

      await syncUser(mockReq as Request, mockRes as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Database synchronization failed' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
