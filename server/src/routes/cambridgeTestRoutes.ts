/**
 * cambridgeTestRoutes.ts
 *
 * Serves Cambridge IELTS test data from PostgreSQL (MockMaterials table)
 * and audio recordings from MinIO (via IStorageProvider).
 *
 * Endpoints:
 *   GET  /sets/:skill      — list available test sets (grouped by book)
 *   GET  /:skill/:book     — full test JSON for a given book + skill
 *   GET  /audio/:book/:file — stream audio from MinIO (deprecated name, now /image and /stream are preferred)
 *   GET  /stream           - stream anything from MinIO by key
 *   GET  /image/:book/:file - stream image from MinIO
 *   POST /grade             — compare user answers to correct answers, compute band score
 */
import { Router } from 'express';
import { cambridgeTestController } from '../container';

const router = Router();

// ─── GET /sets/:skill — List available test sets ───────────────────────────
router.get('/sets/:skill', (req, res, next) => cambridgeTestController.getSets(req, res, next));

// ─── GET /stream — Stream anything directly from MinIO by storage_key ───────
router.get('/stream', (req, res, next) => cambridgeTestController.getStream(req, res, next));

// ─── GET /image/:book/:file — Stream image from MinIO ──────────────────────
router.get('/image/:book/:file', (req, res, next) => cambridgeTestController.getImage(req, res, next));

// ─── POST /grade — Compare user answers, compute band score ────────────────
router.post('/grade', (req, res, next) => cambridgeTestController.grade(req, res, next));

// ─── GET /:skill/:book — Full test data ────────────────────────────────────
router.get('/:skill(reading|listening|writing|speaking)/:book', (req, res, next) => cambridgeTestController.getTest(req, res, next));

export default router;