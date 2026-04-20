/**
 * Seeder: Upload audio recordings from local disk to MinIO
 * and store metadata in the Recordings table.
 *
 * Run via: npx ts-node src/migrations/003_seed_recordings_to_minio.ts
 *
 * Reads all .mp3/.m4a files from src/database/mock-test/record/cam{18,19,20}/
 * and uploads them to the MinIO bucket 'ielts-audio' under the key pattern:
 *   mock-test/cam{book}/{filename}
 *
 * Idempotent: checks if a Recording row with the same storage_key exists
 * before uploading, so it can be re-run safely.
 */
import * as fs from 'fs';
import * as path from 'path';
import sequelize from '../config/database';
import Recording from '../models/Recording';
import { storageProvider } from '../services/storage/StorageService';

const RECORD_DIR = path.resolve(__dirname, '../database/mock-test/record');

// Map file extensions to MIME types
function getMimeType(ext: string): string {
    console.log('[AudioSeeder] getMimeType called', { ext });
    const map: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
        '.webm': 'audio/webm',
        '.ogg': 'audio/ogg',
        '.wav': 'audio/wav',
    };
    const result = map[ext.toLowerCase()] || 'application/octet-stream';
    console.log('[AudioSeeder] getMimeType success', { ext, result });
    return result;
}

async function seedAudioRecordings(): Promise<void> {
    console.log('[AudioSeeder] 003_seed_recordings_to_minio called');
    console.log(`[AudioSeeder] RECORD_DIR: ${RECORD_DIR}`);

    try {
        await sequelize.authenticate();
        console.log('[AudioSeeder] Database connection established');

        // Ensure Recordings table exists
        await Recording.sync({ alter: true });

        const bookDirs = ['cam18', 'cam19', 'cam20'];
        let totalUploaded = 0;
        let totalSkipped = 0;

        for (const bookDir of bookDirs) {
            const dirPath = path.join(RECORD_DIR, bookDir);
            if (!fs.existsSync(dirPath)) {
                console.warn(`[AudioSeeder] Directory not found, skipping: ${dirPath}`);
                continue;
            }

            const files = fs.readdirSync(dirPath).filter(f => {
                const ext = path.extname(f).toLowerCase();
                return ['.mp3', '.m4a', '.webm', '.ogg', '.wav'].includes(ext);
            });

            console.log(`[AudioSeeder] Found ${files.length} audio files in ${bookDir}`);

            for (const filename of files) {
                const storageKey = `mock-test/${bookDir}/${filename}`;

                // Idempotency check
                const existing = await Recording.findOne({
                    where: { storage_key: storageKey },
                });

                if (existing) {
                    console.log(`[AudioSeeder] Skipping existing: ${storageKey}`);
                    totalSkipped++;
                    continue;
                }

                // Read file from disk
                const filePath = path.join(dirPath, filename);
                const buffer = fs.readFileSync(filePath);
                const ext = path.extname(filename);
                const mimetype = getMimeType(ext);
                const sizeBytes = buffer.length;

                console.log(`[AudioSeeder] Uploading: ${storageKey} (${(sizeBytes / 1024 / 1024).toFixed(2)} MB)`);

                // Upload to MinIO via IStorageProvider
                await storageProvider.uploadFile(storageKey, buffer, mimetype);

                // Save metadata to Recordings table
                await Recording.create({
                    book: bookDir,
                    storage_key: storageKey,
                    filename,
                    mimetype,
                    size_bytes: sizeBytes,
                });

                totalUploaded++;
                console.log(`[AudioSeeder] Uploaded and recorded: ${storageKey}`);
            }
        }

        console.log(`[AudioSeeder] 003_seed_recordings_to_minio success`);
        console.log(`  ✅ Uploaded: ${totalUploaded}`);
        console.log(`  ⏩ Skipped (already exists): ${totalSkipped}`);
    } catch (error) {
        console.error('[AudioSeeder] 003_seed_recordings_to_minio error', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Run directly
seedAudioRecordings();
