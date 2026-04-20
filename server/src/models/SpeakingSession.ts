import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../config/database';

class SpeakingSession extends Model<InferAttributes<SpeakingSession>, InferCreationAttributes<SpeakingSession>> {
    declare id: CreationOptional<string>;
    declare userId: string;
    declare startTime: CreationOptional<Date>;
    declare endTime: CreationOptional<Date>;
    declare status: 'in-progress' | 'completed' | 'abandoned';
    declare currentPart: 1 | 2 | 3;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

SpeakingSession.init(
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
        startTime: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        endTime: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('in-progress', 'completed', 'abandoned'),
            defaultValue: 'in-progress',
        },
        currentPart: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            validate: { min: 1, max: 3 }
        },
        createdAt: DataTypes.DATE, // CreationOptional handles the type, but we need to define it for Sequelize
        updatedAt: DataTypes.DATE,
    },
    {
        sequelize,
        modelName: 'SpeakingSession',
        tableName: 'SpeakingSessions',
        timestamps: true,
    }
);

export default SpeakingSession;
