import {
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
} from 'sequelize';
import sequelize from '../config/database';
import TeacherAvailability from './TeacherAvailability';
import { ReservationStatus } from '../types/reservation';

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
    declare availabilityId: number;       // FK → TeacherAvailability
    declare listing: object;
    declare studentId: string;       // Firebase UID
    declare expiresAt: Date;
    declare status: ReservationStatus;
    declare fee: number;
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
        availabilityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'TeacherAvailabilities', key: 'id' },
            onDelete: 'CASCADE',
        },
        listing: {
            type: DataTypes.JSONB,
            allowNull: false,
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
            type: DataTypes.ENUM(
                ReservationStatus.PENDING,
                ReservationStatus.COMPLETED,
                ReservationStatus.EXPIRED
            ),
            allowNull: false,
            defaultValue: ReservationStatus.PENDING,
        },
        fee: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
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
        indexes: [
            // Only one active (pending) reservation per slot at a time
            {
                fields: ['availabilityId'],
                unique: true,
                where: { status: ReservationStatus.PENDING },
                name: 'reservations_availability_id_pending_unique',
            },
            // Only one completed booking per slot (a slot is booked once)
            {
                fields: ['availabilityId'],
                unique: true,
                where: { status: ReservationStatus.COMPLETED },
                name: 'reservations_availability_id_completed_unique',
            },
            // Note: 'expired' rows are intentionally NOT unique-constrained
            // because a slot can be abandoned and re-booked multiple times.
        ]
    }
);

Reservation.belongsTo(TeacherAvailability, { foreignKey: 'availabilityId' });

export default Reservation;
