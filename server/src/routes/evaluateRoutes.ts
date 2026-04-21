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
import { getTask, evaluateEssay, startSession, getSessionsByUser, getSessionDetails } from '../controllers/writingEvaluationController';

const router = Router();

// Writing Agent endpoints (no auth required during development for easier testing)
router.get('/writing/task', getTask);
router.post('/writing/start', startSession);
router.post('/writing/:sessionId/evaluate', evaluateEssay);

// Dashboard History & Details endpoints
router.get('/writing/user/:userId', getSessionsByUser);
router.get('/writing/session/:sessionId/details', getSessionDetails);

export default router;
