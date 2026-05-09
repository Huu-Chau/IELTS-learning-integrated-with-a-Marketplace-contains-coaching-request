import { Request, Response, NextFunction } from 'express';
import { ICambridgeTestService } from '../services/cambridgeTestService';
import { GradeTestPayload } from '../types/cambridge';

export interface ICambridgeTestController {
    getSets(req: Request, res: Response, next: NextFunction): Promise<void>;
    getStream(req: Request, res: Response, next: NextFunction): Promise<void>;
    getImage(req: Request, res: Response, next: NextFunction): Promise<void>;
    grade(req: Request, res: Response, next: NextFunction): Promise<void>;
    getTest(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class CambridgeTestController implements ICambridgeTestController {
    constructor(private cambridgeTestService: ICambridgeTestService) { }

    /**
     * GET /sets/:skill
     */
    async getSets(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { skill } = req.params;
        try {
            const result = await this.cambridgeTestService.getSetsBySkill(skill);
            res.json(result);
            return next();
        } catch (error) {
            console.error('[CambridgeTestController] getSets error', error);
            res.status(500).json({ error: 'Failed to fetch test sets' });
        }
    }

    /**
     * GET /stream
     */
    async getStream(req: Request, res: Response, next: NextFunction): Promise<void> {
        const storageKey = req.query.key as string;
        if (!storageKey) {
            res.status(400).json({ error: 'Missing key parameter' });
            return;
        }

        try {
            let mimeType = 'application/octet-stream';
            const ext = storageKey.split('.').pop()?.toLowerCase();

            if (ext === 'mp3') mimeType = 'audio/mpeg';
            else if (ext === 'm4a' || ext === 'mp4') mimeType = 'audio/mp4';
            else if (ext === 'png') mimeType = 'image/png';
            else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
            else if (ext === 'webp') mimeType = 'image/webp';
            else if (ext === 'svg') mimeType = 'image/svg+xml';

            const stream = await this.cambridgeTestService.getFileStream(storageKey);

            res.setHeader('Content-Type', mimeType);
            res.setHeader('Accept-Ranges', 'bytes');

            stream.pipe(res);
        } catch (error) {
            console.error('[CambridgeTestController] getStream error', error);
            res.status(404).json({ error: 'File not found in MinIO' });
        }
    }

    /**
     * GET /image/:book/:file
     */
    async getImage(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { book, file } = req.params;
        try {
            const storageKey = `mock-test/cam${book}/${file}`;
            const ext = file.split('.').pop()?.toLowerCase();
            let mimeType = 'image/jpeg';
            if (ext === 'png') mimeType = 'image/png';
            if (ext === 'webp') mimeType = 'image/webp';
            else if (ext === 'svg') mimeType = 'image/svg+xml';

            const stream = await this.cambridgeTestService.getFileStream(storageKey);

            res.setHeader('Content-Type', mimeType);
            stream.pipe(res);
        } catch (error) {
            console.error('[CambridgeTestController] getImage error', error);
            res.status(404).json({ error: 'Image file not found' });
        }
    }

    /**
     * POST /grade
     */
    async grade(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { skill, book, testNumber, answers } = req.body;

        if (!skill || !book || !testNumber || !answers) {
            res.status(400).json({ error: 'Missing required fields: skill, book, testNumber, answers' });
            return;
        }

        try {
            const payload = new GradeTestPayload(skill, book, testNumber, answers);
            const result = await this.cambridgeTestService.gradeTest(payload);
            res.json(result);
            return next();
        } catch (error: any) {
            console.error('[CambridgeTestController] grade error', error);
            if (error.message.includes('Test not found')) {
                res.status(404).json({ error: error.message });
                return;
            }
            res.status(500).json({ error: 'Failed to grade test' });
        }
    }

    /**
     * GET /:skill/:book
     */
    async getTest(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { skill, book } = req.params;
        try {
            const result = await this.cambridgeTestService.getTestsByBookAndSkill(book, skill);
            if (!result) {
                res.status(404).json({ error: `No tests found for ${skill} / book ${book}` });
                return;
            }
            res.json(result);
            return next();
        } catch (error) {
            console.error('[CambridgeTestController] getTest error', error);
            res.status(500).json({ error: 'Failed to read test data' });
        }
    }
}
