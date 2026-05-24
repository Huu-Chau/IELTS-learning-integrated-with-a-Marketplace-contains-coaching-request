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

            // If a public endpoint is set, we must generate the signature using that hostname.
            // Otherwise, MinIO will throw a 403 Signature Mismatch because the Host header 
            // the browser sends (e.g. localhost:9000) won't match the internal Host (minio:9000).
            if (process.env.MINIO_PUBLIC_ENDPOINT) {
                try {
                    const publicUrl = new URL(process.env.MINIO_PUBLIC_ENDPOINT);
                    signClient = new Minio.Client({
                        endPoint: publicUrl.hostname,
                        port: parseInt(publicUrl.port || (publicUrl.protocol === 'https:' ? '443' : '80'), 10),
                        useSSL: publicUrl.protocol === 'https:',
                        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
                        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
                        // CRITICAL: We must provide a default region. If we don't, minio-js
                        // will attempt to make an HTTP request to `endPoint` (localhost:9000)
                        region: process.env.MINIO_REGION || 'ap-southeast-1',
                    });
                } catch (e) {
                    console.warn('[MinioStorageProvider] Failed to parse MINIO_PUBLIC_ENDPOINT', e);
                }
            }

            const url = await signClient.presignedGetObject(this.bucket, filename, expirySeconds);
            console.log('[MinioStorageProvider] getFileUrl success', { url: url.substring(0, 80) });
            return url;
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
