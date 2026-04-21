import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../config/database';

class WritingSession extends Model<InferAttributes<WritingSession>, InferCreationAttributes<WritingSession>> {
    declare id: CreationOptional<string>;
    declare userId: string;
    declare book: string;
    declare testNumber: number;
    
    declare status: 'in-progress' | 'completed' | 'abandoned';
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
            type: DataTypes.ENUM('in-progress', 'completed', 'abandoned'),
            defaultValue: 'in-progress',
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
    }
);

export default WritingSession;
