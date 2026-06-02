import { DataTypes, Model, CreationOptional, Optional } from 'sequelize';
import sequelize from '../config/database';
import { WritingSessionStatus } from '../types/writing-session';
import { QueueMessage, QueueTopic } from '../types/queue';
import { queueService } from '../services/queue/queueProvider';

export interface IWritingSessionAttributes {
    id: string;
    userId: string;
    book: string;
    testNumber: number;
    status: WritingSessionStatus;
    startTime: Date;
    endTime: Date | null;
    task1EssayKey: string | null;
    task1FeedbackKey: string | null;
    task1Band: number | null;
    task2EssayKey: string | null;
    task2FeedbackKey: string | null;
    task2Band: number | null;
    overallBand: number | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IWritingSessionCreationAttributes extends Optional<IWritingSessionAttributes, 'id' | 'status' | 'startTime'> { }

class WritingSession extends Model<IWritingSessionAttributes, IWritingSessionCreationAttributes> {
    declare id: CreationOptional<string>;
    declare userId: string;
    declare book: string;
    declare testNumber: number;

    declare status: WritingSessionStatus;
    declare startTime: CreationOptional<Date>;
    declare endTime: CreationOptional<Date>;

    // Task 1 Pointers (MinIO paths)
    declare task1EssayKey: CreationOptional<string | null>;
    declare task1FeedbackKey: CreationOptional<string | null>;
    declare task1Band: CreationOptional<number | null>;

    // Task 2 Pointers (MinIO paths)
    declare task2EssayKey: CreationOptional<string | null>;
    declare task2FeedbackKey: CreationOptional<string | null>;
    declare task2Band: CreationOptional<number | null>;

    // Final combined score
    declare overallBand: CreationOptional<number | null>;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

WritingSession.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        book: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        testNumber: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(WritingSessionStatus.IN_PROGRESS, WritingSessionStatus.COMPLETED, WritingSessionStatus.ABANDONED),
            defaultValue: WritingSessionStatus.IN_PROGRESS,
        },
        startTime: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        endTime: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        task1EssayKey: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        task1FeedbackKey: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        task1Band: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        task2EssayKey: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        task2FeedbackKey: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        task2Band: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        overallBand: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    },
    {
        sequelize,
        modelName: 'WritingSession',
        tableName: 'WritingSessions',
        timestamps: true,
        hooks: {
            afterUpdate: async (session) => {
                if (!session.changed('status')) {
                    return;
                }

                try {
                    await queueService.publish<IWritingSessionAttributes>(
                        new QueueMessage<IWritingSessionAttributes>(session.toJSON<IWritingSessionAttributes>()),
                        QueueTopic.WRITING_SESSION_STATUS_UPDATED,
                    );
                    console.log("✅ WritingSession status updated and message published to Kafka");
                } catch (err) {
                    console.error('[WritingSession Hook] afterUpdate publish error', err);
                }
            }
        }
    }
);

export default WritingSession;
