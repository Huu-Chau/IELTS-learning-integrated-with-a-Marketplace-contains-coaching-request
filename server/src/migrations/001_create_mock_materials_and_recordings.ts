/**
 * Migration: Create MockMaterials and Recordings tables
 *
 * Run via: npx ts-node src/migrations/001_create_mock_materials_and_recordings.ts
 *
 * This uses Sequelize's sync({ force }) for the initial setup.
 * In production, prefer raw SQL migration files — this is for thesis prototype speed.
 */
import sequelize from '../config/database';
import MockMaterial from '../models/MockMaterial';
import Recording from '../models/Recording';

// Define associations before sync
Recording.belongsTo(MockMaterial, { foreignKey: 'material_id' });
MockMaterial.hasMany(Recording, { foreignKey: 'material_id' });

async function migrate() {
    console.log('[Migration] 001_create_mock_materials_and_recordings called');

    try {
        // Test connection
        await sequelize.authenticate();
        console.log('[Migration] Database connection established');

        // Sync both models — creates table if not exists
        // Using alter:true to ADD columns/indexes without dropping existing data
        await MockMaterial.sync({ alter: true });
        console.log('[Migration] MockMaterials table synced');

        await Recording.sync({ alter: true });
        console.log('[Migration] Recordings table synced');

        console.log('[Migration] 001_create_mock_materials_and_recordings success');
        console.log('[Migration] Tables created:');
        console.log('  ✅ MockMaterials (id, book, skill, title, test_number, content[JSONB], test_metadata[JSONB])');
        console.log('  ✅ Recordings (id, material_id[FK], book, storage_key, filename, mimetype, size_bytes)');
    } catch (error) {
        console.error('[Migration] 001_create_mock_materials_and_recordings error', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Run directly
migrate();
