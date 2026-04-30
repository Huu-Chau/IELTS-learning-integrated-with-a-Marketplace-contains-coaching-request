import { Router } from 'express'
import { teacherAvailabilityController } from '../container'
import { verifyToken } from '../middleware/authMiddleware';

export const teacherAvailabilityRouter = Router()

teacherAvailabilityRouter.use(verifyToken());

teacherAvailabilityRouter.post(
    '/',
    (req, res, next) => teacherAvailabilityController.createAvailability(req, res, next),
)

teacherAvailabilityRouter.put(
    '/:id',
    (req, res, next) => teacherAvailabilityController.updateAvailability(req, res, next),
)

teacherAvailabilityRouter.post(
    '/:id/book',
    (req, res, next) => teacherAvailabilityController.bookAvailability(req, res, next),
)

teacherAvailabilityRouter.get(
    '/',
    (req, res, next) => teacherAvailabilityController.getAvailability(req, res, next),
)

teacherAvailabilityRouter.delete(
    '/:id',
    (req, res, next) => teacherAvailabilityController.deleteAvailability(req, res, next),
)
