import { Request, Response } from 'express';
import { attemptService } from '../services/attemptService';

export const attemptController = {
    // POST /api/attempts — Save a new practice attempt
    async create(req: Request, res: Response): Promise<void> {
        console.log('[AttemptController] create called', { userId: req.user?.uid, type: req.body.type, hasFile: !!req.file });
        try {
            const { type, testId, score, feedback, answers } = req.body;

            // Handle file upload if present
            let recordingPath = req.body.recordingPath;
            if (req.file) {
                // Store relative path accessible via static middleware
                // e.g., /uploads/recordings/audio-173648392.mp3
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

            const attempt = await attemptService.createAttempt({
                userId: req.user?.uid || '',
                type,
                testId: testId || null,
                score,
                feedback,
                answers: parsedAnswers,
                recordingPath,
            });
            console.log('[AttemptController] create success', { attemptId: attempt.id, type });
            res.status(201).json(attempt);
        } catch (error: any) {
            console.error('[AttemptController] create error', error);
            res.status(500).json({ error: error.message });
        }
    },

    // GET /api/attempts/user/:uid — Get a user's attempt history
    async getByUser(req: Request, res: Response): Promise<void> {
        console.log('[AttemptController] getByUser called', { uid: req.params.uid });
        try {
            const attempts = await attemptService.getAttemptsByUser(req.params.uid);
            console.log('[AttemptController] getByUser success', { uid: req.params.uid, count: attempts.length });
            res.json(attempts);
        } catch (error: any) {
            console.error('[AttemptController] getByUser error', error);
            res.status(500).json({ error: error.message });
        }
    },

    // GET /api/attempts/:id — Get a single attempt
    async getById(req: Request, res: Response): Promise<void> {
        console.log('[AttemptController] getById called', { id: req.params.id });
        try {
            const attempt = await attemptService.getAttemptById(parseInt(req.params.id, 10));
            if (!attempt) {
                console.log('[AttemptController] getById failed: not found', { id: req.params.id });
                res.status(404).json({ error: 'Attempt not found' });
                return;
            }
            console.log('[AttemptController] getById success', { id: req.params.id });
            res.json(attempt);
        } catch (error: any) {
            console.error('[AttemptController] getById error', error);
            res.status(500).json({ error: error.message });
        }
    },
};
