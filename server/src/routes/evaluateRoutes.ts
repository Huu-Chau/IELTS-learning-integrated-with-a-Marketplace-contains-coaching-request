/**
 * Evaluate Routes
 *
 * Mounts IELTS AI evaluation endpoints:
 *   GET  /api/evaluate/writing/task  → random task
 *   POST /api/evaluate/writing       → SSE evaluation stream
 */

import { Router } from 'express';
import { getTask, evaluateEssay } from '../controllers/writingEvaluationController';

const router = Router();

// Writing Agent endpoints (no auth required during development for easier testing)
router.get('/writing/task', getTask);
router.post('/writing', evaluateEssay);

export default router;
