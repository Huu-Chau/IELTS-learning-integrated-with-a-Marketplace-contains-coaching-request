import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

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
    }
);

export default Attempt;
