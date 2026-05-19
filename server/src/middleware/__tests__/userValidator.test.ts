import { Request, Response, NextFunction } from 'express';
import { validateTopUp, validateSetRole, validateUpdateUser } from '../userValidator';
import { Role } from '../../types/auth';

describe('userValidator Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockReq = {
            body: {}
        };
        mockRes = {
            status: statusMock,
            json: jsonMock
        };
        mockNext = jest.fn();
    });

    describe('validateTopUp', () => {
        it('should pass if credits is a positive number', () => {
            mockReq.body = { credits: 100 };
            validateTopUp(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 400 if credits is missing', () => {
            mockReq.body = {};
            validateTopUp(mockReq as Request, mockRes as Response, mockNext);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid credits amount' });
        });

        it('should return 400 if credits is not a number', () => {
            mockReq.body = { credits: '100' };
            validateTopUp(mockReq as Request, mockRes as Response, mockNext);
            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it('should return 400 if credits is zero or negative', () => {
            mockReq.body = { credits: 0 };
            validateTopUp(mockReq as Request, mockRes as Response, mockNext);
            expect(statusMock).toHaveBeenCalledWith(400);

            mockReq.body = { credits: -10 };
            validateTopUp(mockReq as Request, mockRes as Response, mockNext);
            expect(statusMock).toHaveBeenCalledWith(400);
        });
    });

    describe('validateSetRole', () => {
        it('should pass if role is valid', () => {
            mockReq.body = { role: Role.STUDENT };
            validateSetRole(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 400 if role is invalid', () => {
            mockReq.body = { role: 'invalid' };
            validateSetRole(mockReq as Request, mockRes as Response, mockNext);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid role' });
        });
    });

    describe('validateUpdateUser', () => {
        it('should pass if email is valid', () => {
            mockReq.body = { email: 'test@example.com' };
            validateUpdateUser(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 400 if email is invalid', () => {
            mockReq.body = { email: 'invalid-email' };
            validateUpdateUser(mockReq as Request, mockRes as Response, mockNext);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid email format' });
        });
    });
});
