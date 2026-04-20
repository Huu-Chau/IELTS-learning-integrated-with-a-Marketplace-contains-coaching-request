import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../config/database';

/**
 * TeacherListing model - a service offering created by a teacher in the marketplace.
 * Examples: "Speaking Band 7+ Coaching $25/hr", "Writing Task 2 Deep Review $15".
 */
class TeacherListing extends Model<
    InferAttributes<TeacherListing, { omit: 'createdAt' | 'updatedAt' }>,
    InferCreationAttributes<TeacherListing, { omit: 'createdAt' | 'updatedAt' }>
> {
    declare id: CreationOptional<number>;
    declare teacherId: string;       // Firebase UID
    declare title: string;
    declare description: string;
    declare skills: string[];        // e.g. ['Speaking', 'Writing']
    declare pricePerHour: number;
    declare sessionDuration: number; // minutes, e.g. 30 or 60
    declare isActive: CreationOptional<boolean>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

TeacherListing.init(
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
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        // Stored as a PostgreSQL ARRAY of strings
        skills: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
            defaultValue: [],
        },
        pricePerHour: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        sessionDuration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 60,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        sequelize,
        modelName: 'TeacherListing',
        tableName: 'TeacherListings',
        timestamps: true,
    }
);

export default TeacherListing;
