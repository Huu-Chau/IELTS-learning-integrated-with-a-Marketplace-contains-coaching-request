import fs from 'fs';
import path from 'path';
import sequelize from '../config/database';
import MockMaterial from '../models/MockMaterial';

const MOCK_DIR = path.join(__dirname, '../database/mock-test');

async function seedMockMaterials() {
    try {
        console.log('[Seed] Authenticating to database...');
        await sequelize.authenticate();
        console.log('[Seed] Syncing database to ensure MockMaterials table exists...');
        await sequelize.sync({ alter: true });

        console.log(`[Seed] Reading mock files from ${MOCK_DIR}`);
        const files = fs.readdirSync(MOCK_DIR).filter(file => file.endsWith('.json'));

        let totalInserted = 0;

        for (const file of files) {
            console.log(`[Seed] Processing ${file}...`);
            const filePath = path.join(MOCK_DIR, file);
            const contentRaw = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(contentRaw);

            const book = data.book;
            const skill = data.skill;
            const tests = data.tests;

            if (!book || !skill || !Array.isArray(tests)) {
                console.warn(`[Seed] Skipping ${file} due to missing root structure (book, skill, or tests)`);
                continue;
            }

            for (const test of tests) {
                const testNumber = test.test_number;
                if (!testNumber) {
                    console.warn(`[Seed] Skipping a test in ${file} due to missing test_number`);
                    continue;
                }

                const title = `${book} - Test ${testNumber}`;

                const [material, created] = await MockMaterial.findOrCreate({
                    where: { book, skill, test_number: testNumber },
                    defaults: {
                        book,
                        skill,
                        test_number: testNumber,
                        title,
                        content: test // Contains parts and metadata specific to this test
                    }
                });

                if (created) {
                    console.log(`[Seed] Inserted: ${title} (${skill})`);
                    totalInserted++;
                } else {
                    console.log(`[Seed] Already exists: ${title} (${skill}). Unchanged.`);
                }
            }
        }

        console.log(`[Seed] Success! ${totalInserted} tests successfully uploaded to database.`);

    } catch (error) {
        console.error('[Seed] Database seeding failed:', error);
    } finally {
        console.log('[Seed] Closing database connection...');
        await sequelize.close();
        process.exit(0);
    }
}

seedMockMaterials();
