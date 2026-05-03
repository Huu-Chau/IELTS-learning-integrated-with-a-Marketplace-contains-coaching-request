import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { KafkaService } from '../services/queue/KafkaService';
import { IQueueProvider } from '../services/queue/IQueueProvider';
import { QueueMessage, QueueTopic } from '../types/queue';

const queueService: IQueueProvider = new KafkaService();
/**
 * Attempt model - stores IELTS test results.
 * Linked to a User via Firebase UID.
 */
export interface IAttemptAttributes {
    id: number;
    userId: string;
    testId?: string;
    type: 'reading' | 'listening' | 'writing' | 'speaking' | 'manual';
    score?: number;
    feedback?: string;
    answers?: Record<string, unknown>;
    recordingPath?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IAttemptCreationAttributes extends Optional<IAttemptAttributes, 'id'> { }

class Attempt extends Model<IAttemptAttributes, IAttemptCreationAttributes> implements IAttemptAttributes {
    declare id: number;
    declare userId: string;       // Firebase UID
    declare testId: string;
    declare type: 'reading' | 'listening' | 'writing' | 'speaking' | 'manual';
    declare score: number;
    declare feedback: string;
    declare answers: Record<string, unknown>;
    declare recordingPath: string | null;
    declare createdAt: Date;
    declare updatedAt: Date;
}

Attempt.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.STRING(128),
            allowNull: false,
            references: { model: 'Users', key: 'id' },
        },
        testId: {
            type: DataTypes.STRING,
        },
        type: {
            type: DataTypes.STRING,
        },
        score: {
            type: DataTypes.FLOAT,
        },
        feedback: {
            type: DataTypes.TEXT,
        },
        answers: {
            type: DataTypes.JSONB,
        },
        recordingPath: {
            type: DataTypes.STRING,
        },
    },
    {
        sequelize,
        modelName: 'Attempt',
        tableName: 'Attempts',
        hooks: {
            afterCreate: async (attempt) => {
                console.log("🚀 ~ Attempt ~ afterCreate ~ attempt:", attempt.toJSON())
                await queueService.publish<IAttemptAttributes>(
                    new QueueMessage<IAttemptAttributes>(attempt.toJSON<IAttemptAttributes>()),
                    QueueTopic.ATTEMPT_CREATED,
                );
                console.log("✅ Attempt created and message published to Kafka");
            }
        }
    }
);

export default Attempt;
