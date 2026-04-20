/**
 * StorageService — Factory / Singleton
 *
 * Reads `process.env.STORAGE_PROVIDER` and returns the correct concrete
 * implementation of IStorageProvider. All controllers import from here:
 *
 *   import { storageProvider } from '../services/storage/StorageService';
 *   await storageProvider.uploadFile(filename, buffer, mimeType);
 *
 * To add a new provider (e.g. GCP):
 *   1. Create `GcpStorageProvider.ts` implementing IStorageProvider
 *   2. Add a 'gcp' case to the switch below
 *   3. Set STORAGE_PROVIDER=gcp in your environment
 *   → Zero changes needed in any controller.
 */

import { IStorageProvider } from './IStorageProvider';
import { MinioStorageProvider } from './MinioStorageProvider';

function createStorageProvider(): IStorageProvider {
    const providerName = process.env.STORAGE_PROVIDER || 'minio';
    console.log('[StorageService] createStorageProvider called', { provider: providerName });

    switch (providerName.toLowerCase()) {
        case 'minio':
            return new MinioStorageProvider();

        // ── Future providers ───────────────────────────────────────────
        // case 'gcp':
        //     return new GcpStorageProvider();
        //
        // case 's3':
        //     return new AwsS3StorageProvider();
        // ────────────────────────────────────────────────────────────────

        default:
            console.warn(`[StorageService] Unknown provider "${providerName}", falling back to MinIO`);
            return new MinioStorageProvider();
    }
}

/** Singleton instance — import this in controllers */
export const storageProvider: IStorageProvider = createStorageProvider();
