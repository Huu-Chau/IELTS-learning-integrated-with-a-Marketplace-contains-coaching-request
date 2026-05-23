/**
 * MinioStorageProvider
 *
 * Concrete implementation of IStorageProvider using the MinIO S3-compatible SDK.
 * Used for local development and self-hosted deployments.
 *
 * Configuration is read from environment variables set in docker-compose.yml:
 *   MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY,
 *   MINIO_BUCKET, MINIO_USE_SSL
 */

import * as Minio from 'minio';
import { IStorageProvider } from './IStorageProvider';

export class MinioStorageProvider implements IStorageProvider {
    private client: Minio.Client;
    private bucket: string;

    constructor() {
        console.log('[MinioStorageProvider] constructor called');

        this.bucket = process.env.MINIO_BUCKET || 'ielts-audio';

        this.client = new Minio.Client({
            endPoint: process.env.MINIO_ENDPOINT || 'minio',
            port: parseInt(process.env.MINIO_PORT || '9000', 10),
            useSSL: process.env.MINIO_USE_SSL === 'true',
            accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
            secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        });

        console.log('[MinioStorageProvider] constructor success', {
            endpoint: process.env.MINIO_ENDPOINT || 'minio',
            port: process.env.MINIO_PORT || '9000',
            bucket: this.bucket,
        });
    }

    /**
     * Upload a file buffer to the MinIO bucket.
     * Returns the object path (bucket/filename) for database storage.
     */
    async uploadFile(filename: string, buffer: Buffer, mimeType: string): Promise<string> {
        console.log('[MinioStorageProvider] uploadFile called', {
            filename,
            size: buffer.length,
            mimeType,
        });

        try {
            await this.client.putObject(this.bucket, filename, buffer, buffer.length, {
                'Content-Type': mimeType,
            });

            // Build the direct URL for this object
            const endpoint = process.env.MINIO_ENDPOINT || 'minio';
            const port = process.env.MINIO_PORT || '9000';
            const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
            const objectUrl = `${protocol}://${endpoint}:${port}/${this.bucket}/${filename}`;

            console.log('[MinioStorageProvider] uploadFile success', { objectUrl });
            return objectUrl;
        } catch (error) {
            console.error('[MinioStorageProvider] uploadFile error', error);
            throw error;
        }
    }

    /**
     * Generate a presigned URL for temporary access to a stored file.
     * Defaults to 1 hour expiry.
     */
    async getFileUrl(filename: string, expirySeconds: number = 3600): Promise<string> {
        console.log('[MinioStorageProvider] getFileUrl called', { filename, expirySeconds });

        try {
            let signClient = this.client;

            // AWS v4 signatures require the Host header to match exactly what is used to fetch the URL.
            // If the browser fetches from localhost:9000 but the URL was signed by minio:9000, 
            // MinIO will reject it with 403 SignatureDoesNotMatch.
            // By instantiating a local client pointed at the public endpoint, we generate a valid signature.
            if (process.env.MINIO_PUBLIC_ENDPOINT) {
                const url = new URL(process.env.MINIO_PUBLIC_ENDPOINT);
                signClient = new Minio.Client({
                    endPoint: url.hostname,
                    port: url.port ? parseInt(url.port, 10) : undefined,
                    useSSL: url.protocol === 'https:',
                    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
                    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
                    region: 'us-east-1' // Explicit region prevents network calls during offline signing
                });
            }

            const finalUrl = await signClient.presignedGetObject(this.bucket, filename, expirySeconds);

            console.log('[MinioStorageProvider] getFileUrl success', { url: finalUrl.substring(0, 80) });
            return finalUrl;
        } catch (error) {
            console.error('[MinioStorageProvider] getFileUrl error', error);
            throw error;
        }
    }

    /**
     * Stream a file directly from the MinIO bucket.
     * Avoids presigned URL host-mismatch issues in Docker environments.
     */
    async getFileStream(filename: string): Promise<import('stream').Readable> {
        console.log('[MinioStorageProvider] getFileStream called', { filename });

        try {
            const stream = await this.client.getObject(this.bucket, filename);
            console.log('[MinioStorageProvider] getFileStream success', { filename });
            return stream;
        } catch (error) {
            console.error('[MinioStorageProvider] getFileStream error', error);
            throw error;
        }
    }

    /**
     * Delete a file from the MinIO bucket.
     */
    async deleteFile(filename: string): Promise<void> {
        console.log('[MinioStorageProvider] deleteFile called', { filename });

        try {
            await this.client.removeObject(this.bucket, filename);
            console.log('[MinioStorageProvider] deleteFile success', { filename });
        } catch (error) {
            console.error('[MinioStorageProvider] deleteFile error', error);
            throw error;
        }
    }
}
