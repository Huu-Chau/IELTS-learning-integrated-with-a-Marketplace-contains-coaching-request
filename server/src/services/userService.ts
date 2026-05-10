import User from '../models/User';
import { Role } from '../types/auth';

export interface IUserService {
    getUserById(uid: string): Promise<User | null>;
    updateUser(uid: string, data: Partial<User>): Promise<void>;
    getAllUsers(): Promise<User[]>;
    setUserRole(uid: string, role: Role): Promise<void>;
    topUp(uid: string, credits: number): Promise<number>;
}

export class UserService implements IUserService {
    /**
     * Get a single user by Firebase UID (Postgres).
     */
    async getUserById(uid: string): Promise<User | null> {
        console.log('[UserService] getUserById called', { uid });
        const user = await User.findByPk(uid);
        console.log('[UserService] getUserById success', { uid, found: !!user });
        return user;
    }

    /**
     * Update a user (partial update).
     */
    async updateUser(uid: string, data: Partial<User>): Promise<void> {
        console.log('[UserService] updateUser called', { uid, fields: Object.keys(data) });
        await User.update(data, { where: { id: uid } });
        console.log('[UserService] updateUser success', { uid });
    }

    /**
     * Get all users (Admin only).
     */
    async getAllUsers(): Promise<User[]> {
        console.log('[UserService] getAllUsers called');
        const users = await User.findAll({ order: [['createdAt', 'DESC']] });
        console.log('[UserService] getAllUsers success', { count: users.length });
        return users;
    }

    /**
     * Set a user's role (Admin only).
     */
    async setUserRole(uid: string, role: Role): Promise<void> {
        console.log('[UserService] setUserRole called', { uid, role });
        await User.update({ role }, { where: { id: uid } });
        console.log('[UserService] setUserRole success', { uid, role });
    }

    /**
     * Top up user balance.
     */
    async topUp(uid: string, credits: number): Promise<number> {
        console.log('[UserService] topUp called', { uid, credits });
        const user = await User.findByPk(uid);
        if (!user) {
            throw new Error('User not found');
        }

        // Atomically increment the wallet balance
        await user.increment('wallet_balance', { by: credits });
        await user.reload();

        console.log('[UserService] topUp success', { uid, newBalance: user.wallet_balance });
        return Number(user.wallet_balance);
    }
}
