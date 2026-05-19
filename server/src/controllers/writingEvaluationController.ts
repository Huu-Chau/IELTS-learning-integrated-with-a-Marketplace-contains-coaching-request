import { Request, Response, NextFunction } from 'express';
import { IWritingEvaluationService } from '../services/writingEvaluationService';
import { StartSessionPayload, EvaluateEssayPayload } from '../types/writing-session';
import { WritingPart } from '../types/ai-types';

export interface IWritingEvaluationController {
    getTask(req: Request, res: Response, next: NextFunction): Promise<void>;
    startSession(req: Request, res: Response, next: NextFunction): Promise<void>;
    evaluateEssay(req: Request, res: Response, next: NextFunction): Promise<void>;
    getSessionsByUser(req: Request, res: Response, next: NextFunction): Promise<void>;
    getSessionDetails(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class WritingEvaluationController implements IWritingEvaluationController {
    constructor(private readonly writingEvaluationService: IWritingEvaluationService) { }

    async getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const part = req.query.part as WritingPart;
            const task = this.writingEvaluationService.getRandomTask(part);
            res.json(task);
            return next();
        } catch (error) {
            return next(error);
        }
    }

    async startSession(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, book, testNumber } = req.body;

            if (!userId || !book || testNumber === undefined) {
                res.status(400).json({ error: 'Missing required fields: userId, book, testNumber.' });
                return;
            }

            const payload = new StartSessionPayload(userId, book, testNumber);
            const sessionId = await this.writingEvaluationService.startSession(payload.userId, payload.book, payload.testNumber);

            res.json({ sessionId });
            return next();
        } catch (error) {
            return next(error);
        }
    }

    async evaluateEssay(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { sessionId } = req.params;
        const { essay, taskNumber, wordCount, task, userId } = req.body;

        if (!essay || !taskNumber || !task || !sessionId || !userId) {
            res.status(400).json({ error: 'Missing required fields: essay, taskNumber, task, sessionId, userId.' });
            return;
        }

        const payload = new EvaluateEssayPayload(essay, taskNumber, wordCount, task, userId);

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        try {
            await this.writingEvaluationService.evaluateEssay(sessionId, payload, (chunk) => {
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            });

            res.write(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`);
            res.end();
            return next();
        } catch (error) {
            console.error('[WritingEvaluationController] evaluateEssay error', error);
            res.write(`data: ${JSON.stringify({ error: 'Evaluation failed.' })}\n\n`);
            res.end();
            return next(error);
        }
    }

    async getSessionsByUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId } = req.params;
            const sessions = await this.writingEvaluationService.getSessionsByUser(userId);
            res.json(sessions);
            return next();
        } catch (error) {
            return next(error);
        }
    }

    async getSessionDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { sessionId } = req.params;
            const details = await this.writingEvaluationService.getSessionDetails(sessionId);
            if (!details) {
                res.status(404).json({ error: 'Session not found.' });
                return;
            }
            res.json(details);
            return next();
        } catch (error) {
            return next(error);
        }
    }
}
