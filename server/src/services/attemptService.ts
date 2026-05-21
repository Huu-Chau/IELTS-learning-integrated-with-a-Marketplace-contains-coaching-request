import Attempt from '../models/Attempt';
import { CreateAttemptPayload } from '../types/attempt';

export interface IAttemptService {
    createAttempt(data: CreateAttemptPayload): Promise<Attempt>;
    getAttemptsByUser(userId: string): Promise<Attempt[]>;
    getAttemptById(id: number): Promise<Attempt | null>;
    updateAttempt(id: number, data: Partial<Attempt>): Promise<void>;
    deleteAttempt(id: number, userId: string): Promise<boolean>;
}

export class AttemptService implements IAttemptService {
    /**
     * Save a new practice attempt to Postgres.
     */
    async createAttempt(data: CreateAttemptPayload): Promise<Attempt> {
        console.log('[AttemptService] createAttempt called', { userId: data.userId, type: data.type });
        const attempt = await Attempt.create(data as any);
        console.log('[AttemptService] createAttempt success', { attemptId: attempt.id });
        return attempt;
    }

    /**
     * Get all attempts for a specific user, most recent first.
     */
    async getAttemptsByUser(userId: string): Promise<Attempt[]> {
        console.log('[AttemptService] getAttemptsByUser called', { userId });
        const attempts = await Attempt.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
        });
        console.log('[AttemptService] getAttemptsByUser success', { userId, count: attempts.length });
        return attempts;
    }

    /**
     * Get a single attempt by ID.
     */
    async getAttemptById(id: number): Promise<Attempt | null> {
        console.log('[AttemptService] getAttemptById called', { id });
        const attempt = await Attempt.findByPk(id);
        console.log('[AttemptService] getAttemptById success', { id, found: !!attempt });
        return attempt;
    }

    /**
     * Update an attempt (e.g., to add AI feedback after processing).
     */
    async updateAttempt(id: number, data: Partial<Attempt>): Promise<void> {
        console.log('[AttemptService] updateAttempt called', { id, fields: Object.keys(data) });
        await Attempt.update(data, { where: { id } });
        console.log('[AttemptService] updateAttempt success', { id });
    }

    /**
     * Delete an attempt by ID, scoped to userId so users can only delete their own.
     * Returns true if a row was deleted, false if not found or not owned.
     */
    async deleteAttempt(id: number, userId: string): Promise<boolean> {
        console.log('[AttemptService] deleteAttempt called', { id, userId });
        const deleted = await Attempt.destroy({ where: { id, userId } });
        const success = deleted > 0;
        if (success) {
            console.log('[AttemptService] deleteAttempt success', { id });
        } else {
            console.log('[AttemptService] deleteAttempt: not found or not owned', { id, userId });
        }
        return success;
    }
}

export const attemptService = new AttemptService();