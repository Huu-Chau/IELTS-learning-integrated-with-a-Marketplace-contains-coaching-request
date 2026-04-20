import { Request, Response, NextFunction } from 'express';
import { upload } from '../config/multerConfig';
import multer from 'multer';

/**
 * Middleware to handle audio file uploads.
 * Expects a field named "audio" in the multipart/form-data request.
 */
export const handleAudioUpload = (req: Request, res: Response, next: NextFunction) => {
    console.log('[UploadMiddleware] handleAudioUpload called', { method: req.method, url: req.originalUrl });
    const uploadSingle = upload.single('audio');

    uploadSingle(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            console.error('[UploadMiddleware] handleAudioUpload multer error', { code: err.code, message: err.message });
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred when uploading.
            console.error('[UploadMiddleware] handleAudioUpload unknown error', err);
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        }

        console.log('[UploadMiddleware] handleAudioUpload success', { hasFile: !!req.file });
        // Everything went fine.
        next();
    });
};
