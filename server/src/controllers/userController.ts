import { Request, Response, NextFunction } from 'express';
import { IUserService } from '../services/userService';
import { TopUpPayload, UpdateUserPayload, SetRolePayload } from '../types/user';

export interface IUserController {
    getMe(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    topUp(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    setRole(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class UserController implements IUserController {
    constructor(private readonly userService: IUserService) { }

    // GET /api/users/me — Get authenticated user's own profile (from Postgres)
    getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[UserController] getMe called', { uid: req.user?.uid });
        try {
            const uid = req.user?.uid;
            if (!uid) {
                console.log('[UserController] getMe failed: not authenticated');
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }
            // If syncMiddleware is active, req.dbUser is already available
            if (req.dbUser) {
                console.log('[UserController] getMe success (from dbUser)', { uid });
                res.json(req.dbUser);
                return;
            }
            const user = await this.userService.getUserById(uid);
            if (!user) {
                console.log('[UserController] getMe failed: user not found', { uid });
                res.status(404).json({ error: 'User profile not found' });
                return;
            }
            console.log('[UserController] getMe success', { uid });
            res.json(user);
        } catch (error: any) {
            console.error('[UserController] getMe error', error);
            next(error);
        }
    };

    // GET /api/users/:uid — Get user profile
    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[UserController] getById called', { uid: req.params.uid });
        try {
            const user = await this.userService.getUserById(req.params.uid);
            if (!user) {
                console.log('[UserController] getById failed: user not found', { uid: req.params.uid });
                res.status(404).json({ error: 'User not found' });
                return;
            }
            console.log('[UserController] getById success', { uid: req.params.uid });
            res.json(user);
        } catch (error: any) {
            console.error('[UserController] getById error', error);
            next(error);
        }
    };

    // POST /api/users/me/top-up — Mock Payment Gateway to add credits
    topUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[UserController] topUp called', { uid: req.user?.uid, body: req.body });
        try {
            const uid = req.user?.uid;
            if (!uid) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }

            const payload = new TopUpPayload(req.body.credits);
            const newBalance = await this.userService.topUp(uid, payload.credits);

            console.log('[UserController] topUp success', { uid, newBalance });
            res.json({ message: 'Credits successfully added', walletBalance: newBalance });
        } catch (error: any) {
            console.error('[UserController] topUp error', error);
            if (error.message === 'Invalid credits amount') {
                res.status(400).json({ error: error.message });
                return;
            }
            next(error);
        }
    };

    // PUT /api/users/:uid — Update user profile
    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[UserController] update called', { uid: req.params.uid, body: req.body });
        try {
            const payload = new UpdateUserPayload(req.body.name, req.body.email, req.body.avatar_url);
            await this.userService.updateUser(req.params.uid, payload);
            console.log('[UserController] update success', { uid: req.params.uid });
            res.json({ message: 'User updated successfully' });
        } catch (error: any) {
            console.error('[UserController] update error', error);
            next(error);
        }
    };

    // GET /api/users — List all users (Admin only)
    getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[UserController] getAll called');
        try {
            const users = await this.userService.getAllUsers();
            console.log('[UserController] getAll success', { count: users.length });
            res.json(users);
        } catch (error: any) {
            console.error('[UserController] getAll error', error);
            next(error);
        }
    };

    // PATCH /api/users/:uid/role — Change user role (Admin only)
    setRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[UserController] setRole called', { uid: req.params.uid, role: req.body.role });
        try {
            const payload = new SetRolePayload(req.body.role);
            await this.userService.setUserRole(req.params.uid, payload.role);
            console.log('[UserController] setRole success', { uid: req.params.uid, role: payload.role });
            res.json({ message: `Role updated to ${payload.role}` });
        } catch (error: any) {
            console.error('[UserController] setRole error', error);
            next(error);
        }
    };
}
