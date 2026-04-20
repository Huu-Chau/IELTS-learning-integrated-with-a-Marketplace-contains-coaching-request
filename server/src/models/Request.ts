/**
 * @deprecated — This interface was used by the old Firestore-based request system.
 * The canonical model is now `server/src/models/MarketplaceRequest.ts` (Sequelize).
 * This file is kept only for backwards compatibility with requestController.ts.
 * Use the Sequelize model for all new code.
 */
export interface MarketplaceRequest {
    id?: string;
    studentId: string;
    studentName?: string;
    type: 'broadcast' | 'targeted';
    targetTeacherId?: string;
    status: 'open' | 'accepted' | 'declined' | 'completed';
    message: string;
    skill?: string;
    budget?: number;
    createdAt: string;
    updatedAt?: string;
    acceptedBy?: string;
}
