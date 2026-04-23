import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

/**
 * TeacherAvailability model - stores recurring weekly schedules for teachers.
 * dayOfWeek: 0 (Sunday) to 6 (Saturday).
 * startTime/endTime: HH:mm format (e.g., '09:00', '17:00').
 */
class TeacherAvailability extends Model {
    declare id: number;
    declare teacherId: string;
    declare dayOfWeek: number;
    declare startTime: string;
    declare endTime: string;
    declare isAvailable: boolean;
    declare createdAt: Date;
    declare updatedAt: Date;
}

TeacherAvailability.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        teacherId: {
            type: DataTypes.STRING(128),
            allowNull: false,
            references: { model: 'Users', key: 'id' },
        },
        dayOfWeek: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 0,
                max: 6,
            },
        },
        startTime: {
            type: DataTypes.STRING(5), // HH:mm
            allowNull: false,
        },
        endTime: {
            type: DataTypes.STRING(5), // HH:mm
            allowNull: false,
        },
        isAvailable: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        modelName: 'TeacherAvailability',
        tableName: 'TeacherAvailabilities',
    }
);

export default TeacherAvailability;
