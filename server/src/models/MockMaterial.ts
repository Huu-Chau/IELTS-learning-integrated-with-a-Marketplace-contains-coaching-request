import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../config/database';

/**
 * MockMaterial model — stores complex IELTS mock test JSON structures.
 *
 * Uses JSONB for the deeply nested content (passages, parts, questions).
 * Follows PostgreSQL skill best practices:
 *   - TEXT instead of VARCHAR (no arbitrary length limits)
 *   - TIMESTAMPTZ via Sequelize timestamps
 *   - GIN-indexable JSONB for content queries
 *
 * Design: Repository pattern — accessed via IMockMaterialStorage interface.
 */
class MockMaterial extends Model<
    InferAttributes<MockMaterial>,
    InferCreationAttributes<MockMaterial, { omit: 'id' | 'createdAt' | 'updatedAt' }>
> {
    declare id: CreationOptional<string>;
    declare book: string;                                           // e.g. "Cambridge 20"
    declare skill: 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING';
    declare title: string;                                          // e.g. "Cambridge IELTS 20 - Test 1"
    declare test_number: number;                                    // 1, 2, 3, 4
    declare content: Record<string, unknown>;                       // The massive JSON payload
    declare test_metadata: CreationOptional<Record<string, unknown> | null>;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

MockMaterial.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        book: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        skill: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                isIn: [['READING', 'LISTENING', 'WRITING', 'SPEAKING']],
            },
        },
        title: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        test_number: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        content: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        test_metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    },
    {
        sequelize,
        modelName: 'MockMaterial',
        tableName: 'MockMaterials',
        timestamps: true,
        indexes: [
            // GIN index for querying into the JSONB content
            { fields: ['content'], using: 'GIN' },
            // Composite index for the most common access pattern
            { fields: ['skill', 'book'] },
        ],
    }
);

export default MockMaterial;
