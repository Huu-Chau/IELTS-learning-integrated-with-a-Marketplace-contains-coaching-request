import { Request, Response } from 'express';
import { userService } from '../services/userService';

export const userController = {
    // GET /api/users/me — Get authenticated user's own profile (from Postgres)
    async getMe(req: Request, res: Response): Promise<void> {
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
            const user = await userService.getUserById(uid);
            if (!user) {
                console.log('[UserController] getMe failed: user not found', { uid });
                res.status(404).json({ error: 'User profile not found' });
                return;
            }
            console.log('[UserController] getMe success', { uid });
            res.json(user);
        } catch (error: any) {
            console.error('[UserController] getMe error', error);
            res.status(500).json({ error: error.message });
        }
    },

    // GET /api/users/:uid — Get user profile
    async getById(req: Request, res: Response): Promise<void> {
        console.log('[UserController] getById called', { uid: req.params.uid });
        try {
            const user = await userService.getUserById(req.params.uid);
            if (!user) {
                console.log('[UserController] getById failed: user not found', { uid: req.params.uid });
                res.status(404).json({ error: 'User not found' });
                return;
            }
            console.log('[UserController] getById success', { uid: req.params.uid });
            res.json(user);
        } catch (error: any) {
            console.error('[UserController] getById error', error);
            res.status(500).json({ error: error.message });
        }
    },

    // PUT /api/users/:uid — Update user profile
    async update(req: Request, res: Response): Promise<void> {
        console.log('[UserController] update called', { uid: req.params.uid, body: req.body });
        try {
            await userService.updateUser(req.params.uid, req.body);
            console.log('[UserController] update success', { uid: req.params.uid });
            res.json({ message: 'User updated successfully' });
        } catch (error: any) {
            console.error('[UserController] update error', error);
            res.status(500).json({ error: error.message });
        }
    },

    // GET /api/users — List all users (Admin only)
    async getAll(req: Request, res: Response): Promise<void> {
        console.log('[UserController] getAll called');
        try {
            const users = await userService.getAllUsers();
            console.log('[UserController] getAll success', { count: users.length });
            res.json(users);
        } catch (error: any) {
            console.error('[UserController] getAll error', error);
            res.status(500).json({ error: error.message });
        }
    },

    // PATCH /api/users/:uid/role — Change user role (Admin only)
    async setRole(req: Request, res: Response): Promise<void> {
        console.log('[UserController] setRole called', { uid: req.params.uid, role: req.body.role });
        try {
            const { role } = req.body;
            if (!['student', 'teacher', 'admin'].includes(role)) {
                console.log('[UserController] setRole failed: invalid role', { role });
                res.status(400).json({ error: 'Invalid role' });
                return;
            }
            await userService.setUserRole(req.params.uid, role);
            console.log('[UserController] setRole success', { uid: req.params.uid, role });
            res.json({ message: `Role updated to ${role}` });
        } catch (error: any) {
            console.error('[UserController] setRole error', error);
            res.status(500).json({ error: error.message });
        }
    },
};
