import { Op } from 'sequelize';
import MarketplaceRequest from '../models/MarketplaceRequest';
import { MarketplaceRequestStatus, MarketplaceRequestType } from '../types/marketplace-request';

/**
 * Request service — now powered by PostgreSQL/Sequelize.
 *
 * Migrated from Cloud Firestore to the unified Sequelize MarketplaceRequest model.
 * All marketplace request operations now go through PostgreSQL,
 * consistent with the rest of the application's data layer.
 */

/** Shape used by the legacy controller interface */
export interface LegacyRequestPayload {
    studentId: string;
    studentName?: string;
    type: MarketplaceRequestType;
    targetTeacherId?: string;
    status: string;
    message: string;
    skill?: string;
    budget?: number;
    createdAt: string;
}

/** Shape returned to callers */
export interface RequestResult {
    id: number;
    studentId: string;
    teacherId: string | null;
    status: string;
    message: string | null;
    skill: string | null;
    fee: number;
    requestType: string;
    createdAt: Date;
    updatedAt: Date;
}

export const requestService = {
    /**
     * Create a new marketplace request (broadcast or targeted).
     */
    async createRequest(data: LegacyRequestPayload): Promise<RequestResult> {
        console.log('[RequestService] createRequest called', { studentId: data.studentId, type: data.type, skill: data.skill });
        try {
            const request = await MarketplaceRequest.create({
                studentId: data.studentId,
                teacherId: data.targetTeacherId || null,
                attemptId: null,
                status: MarketplaceRequestStatus.PENDING,
                message: data.message || null,
                skill: data.skill || null,
                fee: data.budget || 0,
                requestType: data.type || MarketplaceRequestType.BROADCAST,
            });

            const result: RequestResult = {
                id: request.id,
                studentId: request.studentId,
                teacherId: request.teacherId,
                status: request.status,
                message: request.message,
                skill: request.skill,
                fee: Number(request.fee),
                requestType: request.requestType,
                createdAt: request.createdAt,
                updatedAt: request.updatedAt,
            };

            console.log('[RequestService] createRequest success', { id: result.id });
            return result;
        } catch (error) {
            console.error('[RequestService] createRequest error', error);
            throw error;
        }
    },

    /**
     * Get all open/pending requests (for teachers to browse).
     */
    async getOpenRequests(): Promise<RequestResult[]> {
        console.log('[RequestService] getOpenRequests called');
        try {
            const requests = await MarketplaceRequest.findAll({
                where: { status: 'pending', requestType: { [Op.ne]: 'booking' } },
                order: [['createdAt', 'DESC']],
            });

            const results = requests.map((r) => ({
                id: r.id,
                studentId: r.studentId,
                teacherId: r.teacherId,
                status: r.status,
                message: r.message,
                skill: r.skill,
                fee: Number(r.fee),
                requestType: r.requestType,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
            }));

            console.log('[RequestService] getOpenRequests success', { count: results.length });
            return results;
        } catch (error) {
            console.error('[RequestService] getOpenRequests error', error);
            throw error;
        }
    },

    /**
     * Get requests targeted at a specific teacher.
     */
    async getRequestsForTeacher(teacherId: string): Promise<RequestResult[]> {
        console.log('[RequestService] getRequestsForTeacher called', { teacherId });
        try {
            const requests = await MarketplaceRequest.findAll({
                where: { teacherId, status: 'pending' },
                order: [['createdAt', 'DESC']],
            });

            const results = requests.map((r) => ({
                id: r.id,
                studentId: r.studentId,
                teacherId: r.teacherId,
                status: r.status,
                message: r.message,
                skill: r.skill,
                fee: Number(r.fee),
                requestType: r.requestType,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
            }));

            console.log('[RequestService] getRequestsForTeacher success', { teacherId, count: results.length });
            return results;
        } catch (error) {
            console.error('[RequestService] getRequestsForTeacher error', error);
            throw error;
        }
    },

    /**
     * Get all requests created by a specific student.
     */
    async getRequestsByStudent(studentId: string): Promise<RequestResult[]> {
        console.log('[RequestService] getRequestsByStudent called', { studentId });
        try {
            const requests = await MarketplaceRequest.findAll({
                where: { studentId },
                order: [['createdAt', 'DESC']],
            });

            const results = requests.map((r) => ({
                id: r.id,
                studentId: r.studentId,
                teacherId: r.teacherId,
                status: r.status,
                message: r.message,
                skill: r.skill,
                fee: Number(r.fee),
                requestType: r.requestType,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
            }));

            console.log('[RequestService] getRequestsByStudent success', { studentId, count: results.length });
            return results;
        } catch (error) {
            console.error('[RequestService] getRequestsByStudent error', error);
            throw error;
        }
    },

    /**
     * Update request status (accept, decline, complete).
     */
    async updateRequestStatus(
        id: string,
        status: 'accepted' | 'declined' | 'completed',
        acceptedBy?: string
    ): Promise<void> {
        console.log('[RequestService] updateRequestStatus called', { id, status, acceptedBy });
        try {
            const request = await MarketplaceRequest.findByPk(parseInt(id, 10));
            if (!request) {
                throw new Error(`Request ${id} not found`);
            }

            const updateData: Record<string, unknown> = { status };
            if (acceptedBy && !request.teacherId) {
                updateData.teacherId = acceptedBy;
            }

            await request.update(updateData);
            console.log('[RequestService] updateRequestStatus success', { id, status });
        } catch (error) {
            console.error('[RequestService] updateRequestStatus error', error);
            throw error;
        }
    },
};
