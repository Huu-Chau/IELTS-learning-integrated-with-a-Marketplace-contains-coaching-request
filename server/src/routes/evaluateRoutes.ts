/**
 * Evaluate Routes
 *
 * Mounts IELTS AI evaluation endpoints:
 *   GET  /api/evaluate/writing/task                    → random task
 *   POST /api/evaluate/writing/start                   → create session
 *   POST /api/evaluate/writing/:sessionId/evaluate     → SSE evaluation stream
 *   GET  /api/evaluate/writing/user/:userId            → session history
 *   GET  /api/evaluate/writing/session/:sessionId/details → session detail + presigned URLs
 */

import { Router } from 'express';
import { writingEvaluationController } from '../container';

const router = Router();

// Writing Agent endpoints (no auth required during development for easier testing)
router.get('/writing/task', (req, res, next) => writingEvaluationController.getTask(req, res, next));
router.post('/writing/start', (req, res, next) => writingEvaluationController.startSession(req, res, next));
router.post('/writing/:sessionId/evaluate', (req, res, next) => writingEvaluationController.evaluateEssay(req, res, next));

// Dashboard History & Details endpoints
router.get('/writing/user/:userId', (req, res, next) => writingEvaluationController.getSessionsByUser(req, res, next));
router.get('/writing/session/:sessionId/details', (req, res, next) => writingEvaluationController.getSessionDetails(req, res, next));

export default router;
