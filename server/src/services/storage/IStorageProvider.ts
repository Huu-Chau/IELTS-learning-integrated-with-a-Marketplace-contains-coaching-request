/**
 * IStorageProvider Interface
 *
 * Defines the contract for any object-storage backend (MinIO, GCP, AWS S3, etc.).
 * Controllers depend only on this interface, making the storage layer fully
 * interchangeable via environment configuration.
 *
 * Includes streaming support for proxying files through the backend.
 *
 * Design pattern: Repository / Strategy Pattern (SOLID — Dependency Inversion)
 */

import { Readable } from 'stream';

export interface IStorageProvider {
    /**
     * Upload a file buffer to the storage backend.
     *
     * @param filename - The object key / file name (e.g. "sessions/abc123/master.webm")
     * @param buffer   - The raw file contents
     * @param mimeType - MIME type of the file (e.g. "audio/webm")
     * @returns The publicly accessible URL or object path of the uploaded file
     */
    uploadFile(filename: string, buffer: Buffer, mimeType: string): Promise<string>;

    /**
     * Generate a time-limited presigned URL for downloading a file.
     *
     * @param filename - The object key to generate a URL for
     * @param expirySeconds - How long the URL should remain valid (default: 3600)
     * @returns A presigned URL string
     */
    getFileUrl(filename: string, expirySeconds?: number): Promise<string>;

    /**
     * Stream a file from the storage backend.
     * Used for proxying files through the backend to avoid presigned URL host mismatches.
     *
     * @param filename - The object key to stream
     * @returns A readable stream of the file content
     */
    getFileStream(filename: string): Promise<Readable>;



    /**
     * Delete a file from the storage backend.
     *
     * @param filename - The object key to delete
     */
    deleteFile(filename: string): Promise<void>;
}
