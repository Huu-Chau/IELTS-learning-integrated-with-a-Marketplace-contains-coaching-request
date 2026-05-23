import { Request, Response, NextFunction } from 'express';
import { IAttemptService } from '../services/attemptService';
import { CreateAttemptPayload } from '../types/attempt';
import { storageProvider } from '../services/storage/StorageService';

export interface IAttemptController {
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    getByUser(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
    getRecordingUrl(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class AttemptController implements IAttemptController {
    constructor(private readonly attemptService: IAttemptService) {
        console.log('this.attemptService', this.attemptService);
    }

    // POST /api/attempts — Save a new practice attempt
    public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        console.log('[AttemptController] create called', { userId: req.user?.uid, type: req.body.type, hasFile: !!req.file });
        try {
            const { type, testId, score, feedback, answers } = req.body;

            // Handle file upload if present
            let recordingPath = req.body.recordingPath;
            if (req.file) {
                // Store relative path accessible via static middleware
                recordingPath = `/uploads/recordings/${req.file.filename}`;
                console.log('[AttemptController] create — file uploaded', { filename: req.file.filename, path: recordingPath });
            }

            const parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;

            // Robust validation for manual (external) results 
            if (type === 'manual' || type === 'external') {
                if (score === undefined || score === null) {
                    res.status(400).json({ error: 'Manual result must include an overall score' });
                    return;
                }
                if (!parsedAnswers || typeof parsedAnswers !== 'object') {
                    res.status(400).json({ error: 'Manual result must include band scores in answers' });
                    return;
                }
            }

            const payload = new CreateAttemptPayload(
                req.user?.uid || '',
                type,
                testId || null,
                score,
                feedback,
                parsedAnswers,
                recordingPath
            );

            const attempt = await this.attemptService.createAttempt(payload);
            console.log('[AttemptController] create success', { attemptId: attempt.id, type });
            res.status(201).json(attempt);
            return next();
        } catch (error: any) {
            console.error('[AttemptController] create error', error);
            res.status(500).json({ error: error.message });
            return next(error);
        }
    }


    // GET /api/attempts/user/:uid — Get a user's attempt history
    public async getByUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        console.log('[AttemptController] getByUser called', { uid: req.params.uid });
        try {
            console.log('=== getByUser this.attemptService', this.attemptService);
            const attempts = await this.attemptService.getAttemptsByUser(req.params.uid);
            console.log('[AttemptController] getByUser success', { uid: req.params.uid, count: attempts.length });
            res.json(attempts);
            return next();
        } catch (error: any) {
            console.error('[AttemptController] getByUser error', error);
            res.status(500).json({ error: error.message });
            return next(error);
        }
    }

    // GET /api/attempts/:id — Get a single attempt
    public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        console.log('[AttemptController] getById called', { id: req.params.id });
        try {
            const attempt = await this.attemptService.getAttemptById(parseInt(req.params.id, 10));
            if (!attempt) {
                console.log('[AttemptController] getById failed: not found', { id: req.params.id });
                res.status(404).json({ error: 'Attempt not found' });
                return;
            }
            console.log('[AttemptController] getById success', { id: req.params.id });
            res.json(attempt);
            return next();
        } catch (error: any) {
            console.error('[AttemptController] getById error', error);
            res.status(500).json({ error: error.message });
            return next(error);
        }
    }

    // DELETE /api/attempts/:id — Remove a user's own attempt
    public async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        console.log('[AttemptController] delete called', { id: req.params.id, uid: req.user?.uid });
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid attempt ID' });
                return;
            }

            const deleted = await this.attemptService.deleteAttempt(id, req.user?.uid || '');
            if (!deleted) {
                console.log('[AttemptController] delete: not found or not owned', { id });
                res.status(404).json({ error: 'Attempt not found or not owned by you' });
                return;
            }

            console.log('[AttemptController] delete success', { id });
            res.status(204).send();
            return next();
        } catch (error: any) {
            console.error('[AttemptController] delete error', error);
            res.status(500).json({ error: error.message });
            return next(error);
        }
    }

    // GET /api/attempts/:id/recording-url — Return a time-limited presigned URL for the attempt's audio recording
    public async getRecordingUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
        console.log('[AttemptController] getRecordingUrl called', { id: req.params.id, uid: req.user?.uid });
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid attempt ID' });
                return;
            }

            const attempt = await this.attemptService.getAttemptById(id);

            // Ownership check — students may only access their own recordings
            if (!attempt || attempt.userId !== req.user?.uid) {
                console.log('[AttemptController] getRecordingUrl: not found or not owned', { id });
                res.status(404).json({ error: 'Attempt not found or not owned by you' });
                return;
            }

            if (!attempt.recordingPath) {
                console.log('[AttemptController] getRecordingUrl: no recording path on attempt', { id });
                res.status(404).json({ error: 'No recording associated with this attempt' });
                return;
            }

            // EDGE CASE: If the attempt was uploaded manually (via dashboard) and saved to local disk, 
            // the recording path starts with '/uploads'. We don't need MinIO for this.
            if (attempt.recordingPath.startsWith('/uploads')) {
                console.log('[AttemptController] getRecordingUrl: local file detected, returning static URL', { id });
                const baseUrl = process.env.VITE_API_URL || 'http://localhost:5000'; // Fallback for local testing
                res.json({ url: `${baseUrl}${attempt.recordingPath}` });
                return next();
            }

            // The DB stores full URLs (e.g. http://minio:9000/ielts-audio/sessions/...). MinIO needs the object key.
            let objectKey = attempt.recordingPath;
            try {
                if (objectKey.startsWith('http')) {
                    const urlObj = new URL(objectKey);
                    // Pathname is usually /bucket-name/object-key
                    const pathParts = urlObj.pathname.split('/').filter(Boolean);
                    
                    // We assume the first path segment is the bucket if it matches standard MinIO config
                    if (pathParts[0] === (process.env.MINIO_BUCKET || 'ielts-audio')) {
                        objectKey = pathParts.slice(1).join('/');
                    } else {
                        // For paths like /sessions/... without bucket
                        objectKey = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
                    }
                }
            } catch (e) {
                console.warn('[AttemptController] getRecordingUrl: failed to parse URL, using raw string as key', e);
            }

            // Presigned URL valid for 60 minutes
            const url = await storageProvider.getFileUrl(objectKey, 3600);

            console.log('[AttemptController] getRecordingUrl success', { id });
            res.json({ url });
            return next();
        } catch (error: any) {
            console.error('[AttemptController] getRecordingUrl error', error);
            res.status(500).json({ error: error.message });
            return next(error);
        }
    }
}