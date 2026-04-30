/**
 * Seeder: Populate MockMaterials table from local JSON files
 *
 * Run via: npx ts-node src/migrations/002_seed_mock_materials.ts
 *
 * Reads the cambridge_XX_{skill}.json + mockSpeakingTests.json + mockWritingTests.json
 * from src/database/mock-test/ and inserts each individual test as a separate row.
 *
 * Idempotent: checks if a record with the same (book, skill, test_number) exists
 * before inserting, so it can be re-run safely.
 */
import * as fs from 'fs';
import * as path from 'path';
import sequelize from '../config/database';
import MockMaterial from '../models/MockMaterial';

const DATA_DIR = path.resolve(__dirname, '../database/mock-test');

/**
 * Seed Cambridge Reading/Listening JSON files.
 * Each file has structure: { book, skill, tests: [{ test_number, ...rest }] }
 * We split each test into a separate MockMaterial row.
 */
async function seedCambridgeTests(): Promise<number> {
    console.log('[Seeder] seedCambridgeTests called');
    let count = 0;

    const cambridgeFiles = [
        'cambridge_18_reading.json',
        'cambridge_18_listening.json',
        'cambridge_19_reading.json',
        'cambridge_19_listening.json',
        'cambridge_20_reading.json',
        'cambridge_20_listening.json',
        // Speaking
        'cambridge_17_speaking.json',
        'cambridge_18_speaking.json',
        'cambridge_19_speaking.json',
        'cambridge_20_speaking.json',
        // Writing
        'cambridge_18_writing.json',
        'cambridge_19_writing.json',
        'cambridge_20_writing.json',
    ];

    for (const filename of cambridgeFiles) {
        const filePath = path.join(DATA_DIR, filename);
        if (!fs.existsSync(filePath)) {
            console.warn(`[Seeder] File not found, skipping: ${filename}`);
            continue;
        }

        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);

        const book: string = data.book;           // e.g. "Cambridge 20"
        const skill: string = data.skill;         // e.g. "READING"
        const tests: any[] = data.tests || [];

        for (const test of tests) {
            const testNumber: number = test.test_number;
            const title: string = test.test_name || `${book} - Test ${testNumber}`;

            // Idempotency check
            const existing = await MockMaterial.findOne({
                where: { book, skill, test_number: testNumber },
            });

            if (existing) {
                console.log(`[Seeder] Updating existing: ${book} / ${skill} / Test ${testNumber}`);
                await existing.update({ content: test });
                count++;
                continue;
            }

            // The "content" is the entire test object (passages, parts, questions)
            await MockMaterial.create({
                book,
                skill: skill as any,
                title,
                test_number: testNumber,
                content: test,
                test_metadata: {
                    source_file: filename,
                    seeded_at: new Date().toISOString(),
                },
            });

            count++;
            console.log(`[Seeder] Inserted: ${book} / ${skill} / Test ${testNumber}`);
        }
    }

    console.log(`[Seeder] seedCambridgeTests success — ${count} rows inserted`);
    return count;
}

/**
 * Seed Speaking mock tests from mockSpeakingTests.json
 * Structure: { mockSpeakingTests: [{ id, title, timeLimit, parts }] }
 */
async function seedSpeakingTests(): Promise<number> {
    console.log('[Seeder] seedSpeakingTests called');
    let count = 0;

    const filePath = path.join(DATA_DIR, 'mockSpeakingTests.json');
    if (!fs.existsSync(filePath)) {
        console.warn('[Seeder] mockSpeakingTests.json not found, skipping');
        return 0;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const tests: any[] = data.mockSpeakingTests || [];

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const testNumber = i + 1;
        const title = test.title || `Speaking Mock Test ${testNumber}`;

        const existing = await MockMaterial.findOne({
            where: { book: 'Mock', skill: 'SPEAKING', test_number: testNumber },
        });

        if (existing) {
            console.log(`[Seeder] Updating existing: Mock / SPEAKING / Test ${testNumber}`);
            await existing.update({ content: test });
            count++;
            continue;
        }

        await MockMaterial.create({
            book: 'Mock',
            skill: 'SPEAKING',
            title,
            test_number: testNumber,
            content: test,
            test_metadata: {
                source_file: 'mockSpeakingTests.json',
                time_limit: test.timeLimit,
                seeded_at: new Date().toISOString(),
            },
        });

        count++;
        console.log(`[Seeder] Inserted: Mock / SPEAKING / Test ${testNumber}`);
    }

    console.log(`[Seeder] seedSpeakingTests success — ${count} rows inserted`);
    return count;
}

/**
 * Seed Writing mock tests from mockWritingTests.json
 */
async function seedWritingTests(): Promise<number> {
    console.log('[Seeder] seedWritingTests called');
    let count = 0;

    const filePath = path.join(DATA_DIR, 'mockWritingTests.json');
    if (!fs.existsSync(filePath)) {
        console.warn('[Seeder] mockWritingTests.json not found, skipping');
        return 0;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    // Writing test structure may vary — handle both array and object formats
    const tests: any[] = Array.isArray(data.mockWritingTests)
        ? data.mockWritingTests
        : Array.isArray(data) ? data : [data];

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const testNumber = i + 1;
        const title = test.title || `Writing Mock Test ${testNumber}`;

        const existing = await MockMaterial.findOne({
            where: { book: 'Mock', skill: 'WRITING', test_number: testNumber },
        });

        if (existing) {
            console.log(`[Seeder] Updating existing: Mock / WRITING / Test ${testNumber}`);
            await existing.update({ content: test });
            count++;
            continue;
        }

        await MockMaterial.create({
            book: 'Mock',
            skill: 'WRITING',
            title,
            test_number: testNumber,
            content: test,
            test_metadata: {
                source_file: 'mockWritingTests.json',
                time_limit: test.timeLimit,
                seeded_at: new Date().toISOString(),
            },
        });

        count++;
        console.log(`[Seeder] Inserted: Mock / WRITING / Test ${testNumber}`);
    }

    console.log(`[Seeder] seedWritingTests success — ${count} rows inserted`);
    return count;
}

/**
 * Main entry point
 */
async function seed() {
    console.log('[Seeder] 002_seed_mock_materials started');
    console.log(`[Seeder] DATA_DIR: ${DATA_DIR}`);

    try {
        await sequelize.authenticate();
        console.log('[Seeder] Database connection established');

        // Ensure table exists
        await MockMaterial.sync({ alter: true });

        const cambridgeCount = await seedCambridgeTests();
        const speakingCount = await seedSpeakingTests();
        const writingCount = await seedWritingTests();

        const total = cambridgeCount + speakingCount + writingCount;
        console.log(`[Seeder] 002_seed_mock_materials success — Total: ${total} rows inserted`);
    } catch (error) {
        console.error('[Seeder] 002_seed_mock_materials error', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Run directly
seed();
