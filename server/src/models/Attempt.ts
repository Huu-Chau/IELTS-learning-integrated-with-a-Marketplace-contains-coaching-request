import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { CreateNotificationPayload, NotificationType } from '../types/notification';
import { NotificationService } from '../services/notificationService';

const notificationService = new NotificationService();

/**
 * Attempt model - stores IELTS test results.
 * Linked to a User via Firebase UID.
 */
class Attempt extends Model {
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
                // TODO: Will change to Event Driven to create notification
                try {
                    const typeLabel = attempt.type.charAt(0).toUpperCase() + attempt.type.slice(1);
                    const scoreStr = attempt.score ? ` · Band ${attempt.score.toFixed(1)}` : '';
                    const payload = new CreateNotificationPayload(
                        attempt.userId,
                        NotificationType.ATTEMPT,
                        `${typeLabel} Test Completed${scoreStr}`,
                        `Your ${attempt.type} mock test result has been saved to your progress.`,
                        '/progress',
                    );
                    await notificationService.createNotification(payload);
                } catch (err) {
                    console.error('[Attempt Hook] Failed to create notification:', err);
                }
            }
        }
    }
);

export default Attempt;
