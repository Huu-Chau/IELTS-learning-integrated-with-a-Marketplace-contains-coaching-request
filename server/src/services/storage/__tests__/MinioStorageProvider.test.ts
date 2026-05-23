import * as Minio from 'minio';
import { MinioStorageProvider } from '../MinioStorageProvider';

jest.mock('minio', () => {
    return {
        Client: jest.fn().mockImplementation(() => ({
            putObject: jest.fn(),
            presignedGetObject: jest.fn(),
            getObject: jest.fn(),
            removeObject: jest.fn(),
        })),
    };
});

describe('MinioStorageProvider', () => {
    let provider: MinioStorageProvider;
    let mockClient: any;

    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        
        process.env.MINIO_BUCKET = 'test-bucket';
        process.env.MINIO_ENDPOINT = 'localhost';
        process.env.MINIO_PORT = '9001';
        process.env.MINIO_USE_SSL = 'false';
        
        provider = new MinioStorageProvider();
        mockClient = (Minio.Client as jest.Mock).mock.results[0].value;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('constructor', () => {
        it('should initialize Minio client with environment variables', () => {
            expect(Minio.Client).toHaveBeenCalledWith({
                endPoint: 'localhost',
                port: 9001,
                useSSL: false,
                accessKey: 'minioadmin',
                secretKey: 'minioadmin',
            });
        });

        it('should use default values if environment variables are missing', () => {
            delete process.env.MINIO_ENDPOINT;
            delete process.env.MINIO_PORT;
            delete process.env.MINIO_BUCKET;
            
            new MinioStorageProvider();
            expect(Minio.Client).toHaveBeenCalledWith(expect.objectContaining({
                endPoint: 'minio',
                port: 9000,
            }));
        });
    });

    describe('uploadFile', () => {
        const filename = 'test.txt';
        const buffer = Buffer.from('hello world');
        const mimeType = 'text/plain';

        it('should upload file and return URL', async () => {
            mockClient.putObject.mockResolvedValue(undefined);

            const result = await provider.uploadFile(filename, buffer, mimeType);

            expect(mockClient.putObject).toHaveBeenCalledWith(
                'test-bucket',
                filename,
                buffer,
                buffer.length,
                { 'Content-Type': mimeType }
            );
            expect(result).toBe('http://localhost:9001/test-bucket/test.txt');
        });

        it('should throw error if upload fails', async () => {
            const error = new Error('Upload failed');
            mockClient.putObject.mockRejectedValue(error);

            await expect(provider.uploadFile(filename, buffer, mimeType)).rejects.toThrow('Upload failed');
        });
    });

    describe('getFileUrl', () => {
        const filename = 'test.txt';

        it('should return a presigned URL', async () => {
            const mockUrl = 'http://localhost:9001/test-bucket/test.txt?token=123';
            mockClient.presignedGetObject.mockResolvedValue(mockUrl);

            const result = await provider.getFileUrl(filename);

            expect(mockClient.presignedGetObject).toHaveBeenCalledWith('test-bucket', filename, 3600);
            expect(result).toBe(mockUrl);
        });

        it('should use a public client to generate URL if public endpoint is provided', async () => {
            process.env.MINIO_PUBLIC_ENDPOINT = 'https://cdn.example.com';
            const mockUrl = 'https://cdn.example.com/test-bucket/test.txt?token=123';
            
            // Make the mock return our already-configured mockClient so we can control presignedGetObject
            (Minio.Client as jest.Mock).mockImplementation(() => mockClient);
            mockClient.presignedGetObject.mockResolvedValue(mockUrl);

            const result = await provider.getFileUrl(filename);

            expect(result).toBe(mockUrl);
            expect(Minio.Client).toHaveBeenCalledWith(expect.objectContaining({
                endPoint: 'cdn.example.com',
                useSSL: true
            }));
        });

        it('should throw error if generating URL fails', async () => {
            const error = new Error('URL generation failed');
            mockClient.presignedGetObject.mockRejectedValue(error);

            await expect(provider.getFileUrl(filename)).rejects.toThrow('URL generation failed');
        });
    });

    describe('getFileStream', () => {
        const filename = 'test.txt';

        it('should return a file stream', async () => {
            const mockStream = { pipe: jest.fn() };
            mockClient.getObject.mockResolvedValue(mockStream);

            const result = await provider.getFileStream(filename);

            expect(mockClient.getObject).toHaveBeenCalledWith('test-bucket', filename);
            expect(result).toBe(mockStream);
        });

        it('should throw error if getting stream fails', async () => {
            const error = new Error('Stream failed');
            mockClient.getObject.mockRejectedValue(error);

            await expect(provider.getFileStream(filename)).rejects.toThrow('Stream failed');
        });
    });

    describe('deleteFile', () => {
        const filename = 'test.txt';

        it('should delete the file', async () => {
            mockClient.removeObject.mockResolvedValue(undefined);

            await provider.deleteFile(filename);

            expect(mockClient.removeObject).toHaveBeenCalledWith('test-bucket', filename);
        });

        it('should throw error if deletion fails', async () => {
            const error = new Error('Delete failed');
            mockClient.removeObject.mockRejectedValue(error);

            await expect(provider.deleteFile(filename)).rejects.toThrow('Delete failed');
        });
    });
});
