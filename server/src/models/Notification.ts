import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../config/database';

/**
 * Notification model - activity notifications for a user.
 * Created server-side when key events happen (new order, payment cleared, etc.)
 */
class Notification extends Model<
    InferAttributes<Notification, { omit: 'createdAt' }>,
    InferCreationAttributes<Notification, { omit: 'createdAt' }>
> {
    declare id: CreationOptional<number>;
    declare userId: string;          // Firebase UID of recipient
    declare type: 'order' | 'payment' | 'message' | 'review' | 'system';
    declare title: string;
    declare body: string;
    declare linkPath: CreationOptional<string | null>; // front-end route to navigate to
    declare isRead: CreationOptional<boolean>;
    declare createdAt: CreationOptional<Date>;
}

Notification.init(
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
        type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'system',
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        linkPath: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        isRead: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    },
    {
        sequelize,
        modelName: 'Notification',
        tableName: 'Notifications',
        timestamps: true,
        updatedAt: false, // only need createdAt
    }
);

export default Notification;
