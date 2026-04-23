import {
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
} from 'sequelize';
import sequelize from '../config/database';

/**
 * Reservation model — implements a 5-minute "soft lock" on a coaching slot.
 *
 * Flow:
 * 1. Student clicks "Book Now" → POST /api/reservations/:listingId creates a row here.
 * 2. expiresAt is set to NOW + 5 minutes; status starts as 'pending'.
 * 3. All other students see the listing as "Pending Booking" during this window.
 * 4a. Student completes payment → status becomes 'completed', MarketplaceRequest is created.
 * 4b. Timer expires or student abandons → status becomes 'expired', listing is free again.
 *
 * Optimistic Locking:
 * The `version` field is incremented on every update. Before confirming payment,
 * the server checks that the client's stored version matches the DB version,
 * preventing race-condition double-charges if two tabs submit simultaneously.
 */
class Reservation extends Model<
    InferAttributes<Reservation, { omit: 'createdAt' | 'updatedAt' }>,
    InferCreationAttributes<Reservation, { omit: 'createdAt' | 'updatedAt' }>
> {
    declare id: CreationOptional<number>;
    declare listingId: number;       // FK → TeacherListings
    declare studentId: string;       // Firebase UID
    declare expiresAt: Date;
    declare status: 'pending' | 'completed' | 'expired';
    declare version: CreationOptional<number>; // Optimistic lock counter
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

Reservation.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        listingId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'TeacherListings', key: 'id' },
            onDelete: 'CASCADE',
        },
        studentId: {
            type: DataTypes.STRING(128),
            allowNull: false,
            references: { model: 'Users', key: 'id' },
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('pending', 'completed', 'expired'),
            allowNull: false,
            defaultValue: 'pending',
        },
        version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        sequelize,
        modelName: 'Reservation',
        tableName: 'Reservations',
        timestamps: true,
        // Sequelize built-in optimistic locking via version field
        version: true,
    }
);

export default Reservation;
