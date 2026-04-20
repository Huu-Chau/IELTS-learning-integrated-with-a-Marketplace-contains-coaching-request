import { Request, Response } from 'express';
import { auth } from '../config/firebase';
import User from '../models/User';

/**
 * Converts a username into a pseudo-email for Firebase Auth.
 * Firebase requires an email format internally.
 */
const toEmail = (username: string): string => {
    console.log('[AuthController] toEmail called', { username });
    const trimmed = username.toLowerCase().trim();
    // If it's already an email, use it as-is
    const result = trimmed.includes('@') ? trimmed : `${trimmed}@ieltsapp.local`;
    console.log('[AuthController] toEmail success', { result });
    return result;
};

export const authController = {
    /**
     * POST /api/auth/register
     * Creates a new user in Firebase Auth, sets role as a Custom Claim,
     * and syncs the user to local Postgres database.
     * This is a PUBLIC endpoint (no token required).
     */
    async register(req: Request, res: Response): Promise<void> {
        console.log('[AuthController] register called', { body: req.body });
        try {
            const { username, password, name, role } = req.body;

            // Validate inputs
            if (!username || !password || !role) {
                console.log('[AuthController] register validation failed: missing fields');
                res.status(400).json({ error: 'Username, password, and role are required.' });
                return;
            }

            if (!['student', 'teacher'].includes(role)) {
                console.log('[AuthController] register validation failed: invalid role', { role });
                res.status(400).json({ error: 'Role must be "student" or "teacher".' });
                return;
            }

            if (password.length < 6) {
                console.log('[AuthController] register validation failed: password too short');
                res.status(400).json({ error: 'Password must be at least 6 characters.' });
                return;
            }

            const pseudoEmail = toEmail(username);

            // 1. Create the user in Firebase Auth via Admin SDK
            const userRecord = await auth.createUser({
                email: pseudoEmail,
                password: password,
                displayName: name || username,
            });
            console.log('[AuthController] Firebase user created', { uid: userRecord.uid, email: pseudoEmail });

            // 2. Sync to Postgres — create a local record with the Firebase UID
            const nameParts = (name || username).split(' ');
            await User.create({
                id: userRecord.uid,
                email: pseudoEmail,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                role,
                wallet_balance: 0.00,
            });

            console.log('[AuthController] register success — user synced to Postgres', { uid: userRecord.uid, role });

            res.status(201).json({
                message: 'User registered successfully.',
                uid: userRecord.uid,
                role,
            });
        } catch (error: any) {
            // Handle Firebase-specific errors
            if (error.code === 'auth/email-already-exists') {
                console.log('[AuthController] register failed: email already exists');
                res.status(409).json({ error: 'This email/username is already in use. Please try logging in instead.' });
            } else {
                console.error('[AuthController] register error', error);
                res.status(500).json({ error: error.message || 'Registration failed.' });
            }
        }
    },
};
