import { Request, Response, NextFunction } from 'express';
import { IAttemptService } from '../services/attemptService';
import { CreateAttemptPayload } from '../types/attempt';

export class AttemptController {
    constructor(private attemptService: IAttemptService) {}

    // POST /api/attempts — Save a new practice attempt
    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    getByUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[AttemptController] getByUser called', { uid: req.params.uid });
        try {
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
    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
}
