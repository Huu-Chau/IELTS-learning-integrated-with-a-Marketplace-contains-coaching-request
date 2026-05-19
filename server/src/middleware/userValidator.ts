import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/auth';

export const validateTopUp = (req: Request, res: Response, next: NextFunction) => {
    const { credits } = req.body;

    if (credits === undefined || credits === null || typeof credits !== 'number' || credits <= 0) {
        return res.status(400).json({ error: 'Invalid credits amount' });
    }

    next();
};

export const validateSetRole = (req: Request, res: Response, next: NextFunction) => {
    const { role } = req.body;

    if (!role || !Object.values(Role).includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    next();
};

export const validateUpdateUser = (req: Request, res: Response, next: NextFunction) => {
    const { name, email, avatar_url } = req.body;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    next();
};
