import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

/**
 * TeacherAvailability model - stores date-specific availability windows.
 * date: YYYY-MM-DD.
 * startTime/endTime: HH:mm format (e.g., '09:00', '17:00').
 */
class TeacherAvailability extends Model {
    declare id: number;
    declare teacherId: string;
    declare date: string;
    declare startTime: string;
    declare endTime: string;
    declare timezone: string;
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
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        startTime: {
            type: DataTypes.STRING(5), // HH:mm
            allowNull: false,
        },
        endTime: {
            type: DataTypes.STRING(5), // HH:mm
            allowNull: false,
        },
        timezone: {
            type: DataTypes.STRING(64),
            allowNull: false,
            defaultValue: 'Asia/Ho_Chi_Minh',
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
