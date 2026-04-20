/**
 * Migration 004: Drop TestMaterials Table
 *
 * The TestMaterials table was used exclusively by the "Practice Test" feature,
 * which has been removed. This migration drops the table to keep the database clean.
 *
 * Run this script manually once to clean up the database:
 *   npx ts-node src/migrations/004_drop_test_materials.ts
 */

import sequelize from '../config/database';

async function dropTestMaterialsTable(): Promise<void> {
    console.log('[Migration 004] Starting — dropping TestMaterials table...');

    try {
        await sequelize.authenticate();
        console.log('[Migration 004] Database connected.');

        const queryInterface = sequelize.getQueryInterface();

        const tableExists = await queryInterface.showAllTables()
            .then(tables => tables.includes('TestMaterials'));

        if (!tableExists) {
            console.log('[Migration 004] TestMaterials table does not exist — skipping.');
        } else {
            await queryInterface.dropTable('TestMaterials');
            console.log('[Migration 004] ✅ TestMaterials table dropped successfully.');
        }
    } catch (error) {
        console.error('[Migration 004] ❌ Error dropping TestMaterials table:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
        console.log('[Migration 004] Database connection closed.');
    }
}

dropTestMaterialsTable();
