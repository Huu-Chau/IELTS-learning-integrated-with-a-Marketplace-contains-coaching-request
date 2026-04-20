/**
 * seedMaterials.ts
 *
 * Run this from the HOST machine (not inside Docker):
 *   npx ts-node scripts/seedMaterials.ts
 *
 * It connects directly to Postgres on localhost:5432 (exposed Docker port).
 * Reads the 4 legacy JSON files from the old project directory and inserts
 * them into the TestMaterials table.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Sequelize, DataTypes } from 'sequelize';

// ── Direct DB connection (host machine → Docker Postgres on port 5432) ────────
const sequelize = new Sequelize('ielts', 'postgres', '123456', {
    host: '127.0.0.1',
    port: 5432,
    dialect: 'postgres',
    logging: false,
});

// ── Inline model definition (avoids import path resolution issues) ─────────────
const TestMaterial = sequelize.define(
    'TestMaterial',
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        skill: { type: DataTypes.STRING(20), allowNull: false },
        title: { type: DataTypes.STRING(255), allowNull: false },
        content: { type: DataTypes.JSONB, allowNull: false },
        metadata: { type: DataTypes.JSONB, allowNull: true },
        difficulty: { type: DataTypes.STRING(20), allowNull: true },
        source: { type: DataTypes.STRING(100), allowNull: true },
    },
    { tableName: 'TestMaterials' }
);

// ── Path to legacy JSON files ─────────────────────────────────────────────────
const DATA_DIR = '/Users/chauhuu21/Documents/test/apps/api/src/database';

interface RawItem {
    id: number;
    title: string;
    [key: string]: unknown;
}

async function seed() {
    console.log('[seedMaterials] Starting seed...');
    await sequelize.authenticate();
    console.log('[seedMaterials] DB connection OK');

    const records: {
        skill: string;
        title: string;
        content: Record<string, unknown>;
        metadata: Record<string, unknown> | null;
        source: string;
    }[] = [];

    // ── Speaking ──────────────────────────────────────────────────────
    const speakingRaw = JSON.parse(
        fs.readFileSync(path.join(DATA_DIR, 'speakingTests.json'), 'utf-8')
    ) as { speakingTests: RawItem[] };

    for (const item of speakingRaw.speakingTests) {
        records.push({ skill: 'speaking', title: item.title, content: item, metadata: null, source: item.title });
    }
    console.log(`[seedMaterials] Speaking: ${speakingRaw.speakingTests.length} records`);

    // ── Writing ───────────────────────────────────────────────────────
    const writingRaw = JSON.parse(
        fs.readFileSync(path.join(DATA_DIR, 'writingTests.json'), 'utf-8')
    ) as { writingTests: (RawItem & { part: number })[] };

    for (const item of writingRaw.writingTests) {
        records.push({ skill: 'writing', title: item.title, content: item, metadata: { part: item.part }, source: item.title });
    }
    console.log(`[seedMaterials] Writing: ${writingRaw.writingTests.length} records`);

    // ── Reading ───────────────────────────────────────────────────────
    const readingRaw = JSON.parse(
        fs.readFileSync(path.join(DATA_DIR, 'readingTests.json'), 'utf-8')
    ) as { readingTests: (RawItem & { passage: number; passage_text: string })[] };

    let readingCount = 0;
    for (const item of readingRaw.readingTests) {
        if (item.passage_text?.startsWith('[ADD YOUR')) {
            console.log(`[seedMaterials] Skipping placeholder: ${item.title}`);
            continue;
        }
        records.push({ skill: 'reading', title: item.title, content: item, metadata: { passage: item.passage }, source: item.title });
        readingCount++;
    }
    console.log(`[seedMaterials] Reading: ${readingCount} records (placeholders skipped)`);

    // ── Listening ─────────────────────────────────────────────────────
    const listeningRaw = JSON.parse(
        fs.readFileSync(path.join(DATA_DIR, 'listeningTests.json'), 'utf-8')
    ) as { listeningTests: (RawItem & { section: number })[] };

    for (const item of listeningRaw.listeningTests) {
        records.push({ skill: 'listening', title: item.title, content: item, metadata: { section: item.section }, source: item.title });
    }
    console.log(`[seedMaterials] Listening: ${listeningRaw.listeningTests.length} records`);

    // ── Bulk Insert (idempotent — truncate first so re-runs are safe) ─────
    console.log('[seedMaterials] Truncating existing TestMaterials rows...');
    await sequelize.query('TRUNCATE TABLE "TestMaterials" RESTART IDENTITY CASCADE');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inserted = await TestMaterial.bulkCreate(records as any[], {
        // If somehow duplicates slip through (e.g. no TRUNCATE perms), upsert them
        updateOnDuplicate: ['skill', 'title', 'content', 'metadata', 'source'],
    });
    console.log(`[seedMaterials] ✅ Inserted ${inserted.length} total records into TestMaterials`);

    await sequelize.close();
    process.exit(0);
}

seed().catch((err) => {
    console.error('[seedMaterials] ❌ Seed failed:', err);
    process.exit(1);
});
