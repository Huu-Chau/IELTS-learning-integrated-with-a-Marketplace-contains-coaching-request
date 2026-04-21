/**
 * Seeder: Upload writing task images from local disk to MinIO
 * and store metadata in the Recordings table.
 *
 * Run via: npx ts-node src/migrations/005_seed_writing_images_to_minio.ts
 *
 * Reads all image files from src/database/mock-test/writing-assets/cam{18,19,20}/
 * and uploads them to the MinIO bucket 'ielts-audio' under the key pattern:
 *   mock-test/writing/cam{book}/{filename}
 */
import * as fs from 'fs';
import * as path from 'path';
import sequelize from '../config/database';
import Recording from '../models/Recording';
import { storageProvider } from '../services/storage/StorageService';

const WRITING_ASSETS_DIR = path.resolve(__dirname, '../database/mock-test/writing-assets');

function getMimeType(ext: string): string {
    console.log('[ImageSeeder] getMimeType called', { ext });
    const map: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
    };
    const result = map[ext.toLowerCase()] || 'application/octet-stream';
    console.log('[ImageSeeder] getMimeType success', { ext, result });
    return result;
}

async function seedWritingImages(): Promise<void> {
    console.log('[ImageSeeder] 005_seed_writing_images_to_minio called');
    console.log(`[ImageSeeder] WRITING_ASSETS_DIR: ${WRITING_ASSETS_DIR}`);

    try {
        await sequelize.authenticate();
        console.log('[ImageSeeder] Database connection established');

        await Recording.sync({ alter: true });

        const bookDirs = ['cam18', 'cam19', 'cam20'];
        let totalUploaded = 0;
        let totalSkipped = 0;

        for (const bookDir of bookDirs) {
            const dirPath = path.join(WRITING_ASSETS_DIR, bookDir);
            if (!fs.existsSync(dirPath)) {
                console.warn(`[ImageSeeder] Directory not found, skipping: ${dirPath}`);
                continue;
            }

            const files = fs.readdirSync(dirPath).filter(f => {
                const ext = path.extname(f).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext);
            });

            console.log(`[ImageSeeder] Found ${files.length} image files in ${bookDir}`);

            for (const filename of files) {
                // Upload under the 'mock-test/writing/camX/' path in MinIO
                const storageKey = `mock-test/writing/${bookDir}/${filename}`;

                const existing = await Recording.findOne({
                    where: { storage_key: storageKey },
                });

                if (existing) {
                    console.log(`[ImageSeeder] Skipping existing: ${storageKey}`);
                    totalSkipped++;
                    continue;
                }

                const filePath = path.join(dirPath, filename);
                const buffer = fs.readFileSync(filePath);
                const ext = path.extname(filename);
                const mimetype = getMimeType(ext);
                const sizeBytes = buffer.length;

                console.log(`[ImageSeeder] Uploading: ${storageKey} (${(sizeBytes / 1024).toFixed(2)} KB)`);

                await storageProvider.uploadFile(storageKey, buffer, mimetype);

                await Recording.create({
                    book: bookDir,
                    storage_key: storageKey,
                    filename,
                    mimetype,
                    size_bytes: sizeBytes,
                });

                totalUploaded++;
                console.log(`[ImageSeeder] Uploaded and recorded: ${storageKey}`);
            }
        }

        console.log(`[ImageSeeder] 005_seed_writing_images_to_minio success`);
        console.log(`  ✅ Uploaded: ${totalUploaded}`);
        console.log(`  ⏩ Skipped (already exists): ${totalSkipped}`);
    } catch (error) {
        console.error('[ImageSeeder] 005_seed_writing_images_to_minio error', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

seedWritingImages();
