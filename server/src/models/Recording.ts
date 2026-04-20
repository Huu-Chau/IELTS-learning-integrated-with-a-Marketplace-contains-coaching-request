import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../config/database';

/**
 * Recording model — stores metadata for audio recordings (listening test audio).
 *
 * The actual binary audio data lives in MinIO (via IStorageProvider).
 * This table stores only the metadata + storage_key for retrieval.
 *
 * Follows PostgreSQL skill best practices:
 *   - TEXT instead of VARCHAR
 *   - BIGINT for size_bytes (audio files can exceed 2GB in theory)
 *   - FK indexes are explicit (Sequelize creates them, but we're explicit)
 */
class Recording extends Model<
    InferAttributes<Recording>,
    InferCreationAttributes<Recording, { omit: 'id' | 'createdAt' | 'updatedAt' }>
> {
    declare id: CreationOptional<string>;
    declare material_id: CreationOptional<string | null>;   // FK to MockMaterials (nullable for standalone recordings)
    declare book: string;                                    // e.g. "cam20"
    declare storage_key: string;                             // MinIO object key
    declare filename: string;                                // Original filename e.g. "T1S1.m4a"
    declare mimetype: string;                                // e.g. "audio/mp4", "audio/mpeg"
    declare size_bytes: number;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

Recording.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        material_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'MockMaterials',
                key: 'id',
            },
        },
        book: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        storage_key: {
            type: DataTypes.TEXT,
            allowNull: false,
            unique: true,
        },
        filename: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        mimetype: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        size_bytes: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    },
    {
        sequelize,
        modelName: 'Recording',
        tableName: 'Recordings',
        timestamps: true,
        indexes: [
            { fields: ['material_id'] },    // FK index (PostgreSQL does NOT auto-index FKs)
            { fields: ['book'] },            // Common filter
            { fields: ['book', 'filename'] }, // Unique lookup pattern
        ],
    }
);

export default Recording;
