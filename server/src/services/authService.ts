import { auth } from '../config/firebase';
import User from '../models/User';
import { IRegisterResult, RegisterPayload } from '../types/auth';

export interface IAuthService {
    register(payload: RegisterPayload): Promise<IRegisterResult>;
}

export class AuthService implements IAuthService {
    constructor() { }

    private toEmail(username: string): string {
        const trimmed = username.toLowerCase().trim();
        return trimmed.includes('@') ? trimmed : `${trimmed}@ieltsapp.local`;
    }

    async register(payload: RegisterPayload): Promise<IRegisterResult> {
        const { username, password, name, role } = payload;
        const pseudoEmail = this.toEmail(username);

        try {
            // 1. Create the user in Firebase Auth via Admin SDK
            const userRecord = await auth.createUser({
                email: pseudoEmail,
                password: password,
                displayName: name || username,
            });

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

            return {
                uid: userRecord.uid,
                role,
                message: 'User registered successfully.'
            };
        } catch (error: any) {
            if (error.code === 'auth/email-already-exists') {
                const customError = new Error('This email/username is already in use. Please try logging in instead.');
                (customError as any).statusCode = 409;
                throw customError;
            }
            throw error;
        }
    }
}
