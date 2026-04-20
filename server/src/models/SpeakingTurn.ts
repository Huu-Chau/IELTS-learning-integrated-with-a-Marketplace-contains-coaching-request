import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../config/database';

class SpeakingTurn extends Model<InferAttributes<SpeakingTurn>, InferCreationAttributes<SpeakingTurn>> {
    declare id: CreationOptional<string>;
    declare sessionId: string;
    declare role: 'examiner' | 'candidate';
    declare textContent: string;
    declare audioUrl: CreationOptional<string | null>;
    declare createdAt: CreationOptional<Date>;
}

SpeakingTurn.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        sessionId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        role: {
            type: DataTypes.ENUM('examiner', 'candidate'),
            allowNull: false,
        },
        textContent: {
            type: DataTypes.TEXT,
            allowNull: false, // Transcript or AI response
        },
        audioUrl: {
            type: DataTypes.STRING,
            allowNull: true, // Optional for examiner if we only have text
        },
        createdAt: DataTypes.DATE,
    },
    {
        sequelize,
        modelName: 'SpeakingTurn',
        tableName: 'SpeakingTurns',
        timestamps: true,
        updatedAt: false, // Turns are immutable history
    }
);

export default SpeakingTurn;
