import { Request, Response, NextFunction } from 'express';
import { IAuthService } from '../services/authService';
import { RegisterPayload } from '../types/auth';

export interface IAuthController {
    register(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class AuthController implements IAuthController {
    constructor(private readonly authService: IAuthService) { }

    /**
     * POST /api/auth/register
     * Creates a new user in Firebase Auth and syncs the user to local Postgres database.
     */
    public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[AuthController] register called', { body: { ...req.body, password: '***' } });
        try {
            const { username, password, name, role } = req.body;
            const payload = new RegisterPayload(
                username,
                password,
                name,
                role
            );
            const result = await this.authService.register(payload);

            console.log('[AuthController] register success', { uid: result.uid, role: result.role });

            res.status(201).json(result);
            return next();
        } catch (error: any) {
            console.error('[AuthController] register error', error);
            if (error.statusCode) {
                res.status(error.statusCode).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message || 'Registration failed.' });
            }
        }
    };
}
