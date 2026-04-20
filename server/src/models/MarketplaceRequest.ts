import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

/**
 * MarketplaceRequest model - manages student-teacher review requests.
 * Links students to teachers for paid IELTS feedback.
 *
 * Unified model that replaces both the old Firestore-based request system
 * and serves the new marketplace booking flow.
 */
class MarketplaceRequest extends Model {
    declare id: number;
    declare studentId: string;            // Firebase UID
    declare teacherId: string | null;     // Firebase UID (nullable for broadcast requests)
    declare attemptId: number | null;     // Optional — links to Attempts table
    declare status: 'pending' | 'accepted' | 'completed' | 'rejected';
    declare feedbackPath: string | null;
    declare fee: number;
    declare message: string | null;       // Student's message / description
    declare skill: string | null;         // e.g. 'Writing', 'Speaking'
    declare requestType: string;          // 'broadcast' | 'targeted' | 'booking'
    declare createdAt: Date;
    declare updatedAt: Date;
}

MarketplaceRequest.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        studentId: {
            type: DataTypes.STRING(128),
            allowNull: false,
            references: { model: 'Users', key: 'id' },
        },
        teacherId: {
            type: DataTypes.STRING(128),
            allowNull: true,
            references: { model: 'Users', key: 'id' },
        },
        attemptId: {
            type: DataTypes.INTEGER,
            allowNull: true,  // Now nullable — not all requests link to an attempt
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'pending',
        },
        feedbackPath: {
            type: DataTypes.STRING,
        },
        fee: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        skill: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        requestType: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'booking',
        },
    },
    {
        sequelize,
        modelName: 'MarketplaceRequest',
        tableName: 'MarketplaceRequests',
    }
);

export default MarketplaceRequest;
