import Attempt from '../models/Attempt';
import { CreateAttemptPayload } from '../types/attempt';

export interface IAttemptService {
    createAttempt(data: CreateAttemptPayload): Promise<Attempt>;
    getAttemptsByUser(userId: string): Promise<Attempt[]>;
    getAttemptById(id: number): Promise<Attempt | null>;
    updateAttempt(id: number, data: Partial<Attempt>): Promise<void>;
    deleteAttempt(id: number, userId: string): Promise<boolean>;
    getRecordingUrl(attemptId: number, userId: string): Promise<string | null>;
}

import { IStorageProvider } from './storage/IStorageProvider';

export class AttemptService implements IAttemptService {
    constructor(private readonly storageProvider?: IStorageProvider) {}

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

    /**
     * Get a presigned URL for an attempt's recording.
     * Verifies ownership and returns the URL, or null if not found/authorized.
     */
    async getRecordingUrl(attemptId: number, userId: string): Promise<string | null> {
        console.log('[AttemptService] getRecordingUrl called', { attemptId, userId });

        if (!this.storageProvider) {
            console.warn('[AttemptService] getRecordingUrl: storageProvider not injected');
            return null;
        }

        const attempt = await this.getAttemptById(attemptId);
        if (!attempt) {
            console.log('[AttemptService] getRecordingUrl: attempt not found', { attemptId });
            return null;
        }

        if (attempt.userId !== userId) {
            console.log('[AttemptService] getRecordingUrl: not owned by user', { attemptId, owner: attempt.userId, requester: userId });
            return null;
        }

        if (!attempt.recordingPath) {
            console.log('[AttemptService] getRecordingUrl: no recording path', { attemptId });
            return null;
        }

        // Extract the object key from the full MinIO URL.
        let objectKey = attempt.recordingPath;
        const bucketName = process.env.MINIO_BUCKET || 'ielts-audio';
        const bucketIndex = objectKey.indexOf(`/${bucketName}/`);
        if (bucketIndex !== -1) {
            objectKey = objectKey.substring(bucketIndex + `/${bucketName}/`.length);
        }

        // 60 minutes = 3600 seconds
        const presignedUrl = await this.storageProvider.getFileUrl(objectKey, 3600);
        console.log('[AttemptService] getRecordingUrl success', { attemptId, urlPrefix: presignedUrl.substring(0, 80) });
        return presignedUrl;
    }
}

// Keeping the default export empty constructor for backward compatibility in tests
// Real injection happens in container.ts
export const attemptService = new AttemptService();