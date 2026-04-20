import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import User from '../models/User';

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                uid: string;
                email: string;
                role?: string;
                emailVerified?: boolean;
            };
            dbUser?: User; // Postgres user record (set by syncMiddleware)
        }
    }
}

/**
 * Middleware to verify Firebase ID token from Authorization header.
 * Attaches decoded user info (including role from Custom Claims) to req.user.
 * 
 * @param options - Configuration options
 * @param options.requireEmailVerified - If true, rejects requests from unverified users
 * 
 * @example
 * // Standard authentication
 * app.get('/api/profile', verifyToken(), profileController.get);
 * 
 * @example
 * // Require email verification for premium features
 * app.post('/api/marketplace/request', verifyToken({ requireEmailVerified: true }), marketplaceController.create);
 */
export const verifyToken = (options: { requireEmailVerified?: boolean } = {}) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[AuthMiddleware] verifyToken called', { method: req.method, url: req.originalUrl });
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('[AuthMiddleware] verifyToken failed: no token provided');
            res.status(401).json({ error: 'No token provided. Use Authorization: Bearer <token>' });
            return;
        }

        const token = authHeader.split('Bearer ')[1];

        try {
            const decoded = await auth.verifyIdToken(token);
            req.user = {
                uid: decoded.uid,
                email: decoded.email || '',
                role: (decoded.role as string) || undefined,
                emailVerified: decoded.email_verified || false,
            };
            console.log('[AuthMiddleware] verifyToken success', { uid: decoded.uid, role: req.user.role });

            // Optional: Check email verification requirement
            if (options.requireEmailVerified && !req.user.emailVerified) {
                console.log('[AuthMiddleware] verifyToken failed: email not verified', { uid: decoded.uid });
                res.status(403).json({
                    error: 'Email verification required to access this resource.',
                    code: 'EMAIL_NOT_VERIFIED'
                });
                return;
            }

            next();
        } catch (error) {
            console.error('[AuthMiddleware] verifyToken error — invalid or expired token', error);
            res.status(401).json({ error: 'Invalid or expired token' });
        }
    };
};

/**
 * Middleware to check if the authenticated user has the 'admin' role.
 * Reads role from Custom Claims (already in req.user from verifyToken).
 * Must be used AFTER verifyToken.
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('[AuthMiddleware] requireAdmin called', { uid: req.user?.uid, role: req.user?.role });
    if (!req.user) {
        console.log('[AuthMiddleware] requireAdmin failed: not authenticated');
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    // Role is already available from the decoded token's custom claims
    if (req.user.role !== 'admin') {
        console.log('[AuthMiddleware] requireAdmin failed: not admin', { uid: req.user.uid, role: req.user.role });
        res.status(403).json({ error: 'Admin access required' });
        return;
    }

    console.log('[AuthMiddleware] requireAdmin success', { uid: req.user.uid });
    next();
};

/**
 * Middleware to auto-create missing Postgres records for authenticated users.
 * This ensures users created directly in Firebase (or whose local DB records were wiped)
 * are properly synchronized to the local Postgres database.
 * Must be used AFTER verifyToken.
 */
export const syncUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('[AuthMiddleware] syncUser called', { uid: req.user?.uid });

    if (!req.user) {
        console.log('[AuthMiddleware] syncUser skipped: not authenticated');
        return next();
    }

    try {
        const { uid, email, role } = req.user;
        let user = await User.findByPk(uid);

        if (!user) {
            console.log('[AuthMiddleware] syncUser: creating missing Postgres user sync logic', { uid });
            
            const namePrefix = email ? email.split('@')[0] : 'User';
            
            user = await User.create({
                id: uid,
                email: email || `${uid}@ieltsapp.local`,
                firstName: namePrefix,
                lastName: '',
                role: (role as any) || 'student', // Fallback role
                wallet_balance: 0.00
            });
            console.log('[AuthMiddleware] syncUser: Postgres user created', { uid });
        } else {
            console.log('[AuthMiddleware] syncUser: Postgres user found', { uid });
        }
        
        req.dbUser = user;
        next();
    } catch (error) {
        console.error('[AuthMiddleware] syncUser error', error);
        res.status(500).json({ error: 'Database synchronization failed' });
    }
};
