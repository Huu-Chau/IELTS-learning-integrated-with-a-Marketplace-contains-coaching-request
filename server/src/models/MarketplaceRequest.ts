import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Reservation from './Reservation';
import { KafkaService } from '../services/queue/KafkaService';
import { IQueueProvider } from '../services/queue/IQueueProvider';
import { QueueMessage, QueueTopic } from '../types/queue';

const queueService: IQueueProvider = new KafkaService();

/**
 * MarketplaceRequest model - manages student-teacher review requests.
 * Links students to teachers for paid IELTS feedback.
 *
 * Unified model that replaces both the old Firestore-based request system
 * and serves the new marketplace booking flow.
 */
export interface IMarketplaceRequestAttributes {
    id: number;
    studentId: string;
    reservationId?: number;
    teacherId: string | null;
    attemptId: number | null;
    status: 'pending' | 'accepted' | 'completed' | 'rejected';
    feedbackPath: string | null;
    fee: number;
    message: string | null;
    skill: string | null;
    requestType: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface IMarketplaceRequestCreationAttributes extends Optional<IMarketplaceRequestAttributes, 'id' | 'status' | 'requestType'> { }

class MarketplaceRequest extends Model<IMarketplaceRequestAttributes, IMarketplaceRequestCreationAttributes> implements IMarketplaceRequestAttributes {
    declare id: number;
    declare studentId: string;            // Firebase UID
    declare reservationId?: number;       // FK → Reservation
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
        reservationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'Reservations', key: 'id' },
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
        hooks: {
            afterCreate: async (request) => {
                try {
                    await queueService.publish<IMarketplaceRequestAttributes>(
                        new QueueMessage<IMarketplaceRequestAttributes>(request.toJSON<IMarketplaceRequestAttributes>()),
                        QueueTopic.MARKETPLACE_REQUEST_CREATED,
                    );
                    console.log("✅ MarketplaceRequest created and message published to Kafka");
                } catch (err) {
                    console.error('[MarketplaceRequest Hook] afterCreate publish error', err);
                }
            },
            afterUpdate: async (request, options) => {
                if (!request.changed('status')) {
                    return;
                }

                try {
                    await queueService.publish<IMarketplaceRequestAttributes>(
                        new QueueMessage<IMarketplaceRequestAttributes>(request.toJSON<IMarketplaceRequestAttributes>()),
                        QueueTopic.MARKETPLACE_REQUEST_STATUS_UPDATED,
                    );
                    console.log("✅ MarketplaceRequest status updated and message published to Kafka");
                } catch (err) {
                    console.error('[MarketplaceRequest Hook] afterUpdate publish error', err);
                }
            }
        }
    }
);

MarketplaceRequest.belongsTo(Reservation, { foreignKey: 'reservationId' });

export default MarketplaceRequest;