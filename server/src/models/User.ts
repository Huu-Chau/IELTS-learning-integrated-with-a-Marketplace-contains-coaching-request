import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../config/database';

/**
 * User model - synced from Firebase Auth.
 * The `id` is the Firebase UID (string), NOT an auto-increment integer.
 * Firebase handles authentication; this table stores app-specific data.
 */
class User extends Model<InferAttributes<User, { omit: 'createdAt' | 'updatedAt' }>, InferCreationAttributes<User, { omit: 'createdAt' | 'updatedAt' }>> {
    declare id: string;          // Firebase UID
    declare firstName: string;
    declare lastName: string;
    declare email: string;
    declare role: 'student' | 'teacher' | 'admin';
    declare wallet_balance: CreationOptional<number>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

User.init(
    {
        id: {
            type: DataTypes.STRING(128),
            primaryKey: true,
            allowNull: false,
        },
        firstName: {
            type: DataTypes.STRING,
        },
        lastName: {
            type: DataTypes.STRING,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'student',
        },
        wallet_balance: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.00,
        },
    },
    {
        sequelize,
        modelName: 'User',
        tableName: 'Users',
        timestamps: true,
    }
);

export default User;
