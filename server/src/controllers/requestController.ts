import { Request, Response } from 'express';
import { requestService } from '../services/requestService';

export const requestController = {
    // POST /api/requests — Create a marketplace request
    async create(req: Request, res: Response): Promise<void> {
        console.log('[RequestController] create called', { studentId: req.user?.uid, type: req.body.type, skill: req.body.skill });
        try {
            const { type, targetTeacherId, message, skill, budget, studentName } = req.body;
            const request = await requestService.createRequest({
                studentId: req.user?.uid || '',
                studentName,
                type: type || 'broadcast',
                targetTeacherId,
                status: 'open',
                message,
                skill,
                budget,
                createdAt: new Date().toISOString(),
            });
            console.log('[RequestController] create success', { requestId: request.id, type: request.requestType });
            res.status(201).json(request);
        } catch (error: any) {
            console.error('[RequestController] create error', error);
            res.status(500).json({ error: error.message });
        }
    },

    // GET /api/requests — Get all open requests (Teacher view)
    async getOpen(req: Request, res: Response): Promise<void> {
        console.log('[RequestController] getOpen called');
        try {
            const requests = await requestService.getOpenRequests();
            console.log('[RequestController] getOpen success', { count: requests.length });
            res.json(requests);
        } catch (error: any) {
            console.error('[RequestController] getOpen error', error);
            res.status(500).json({ error: error.message });
        }
    },

    // GET /api/requests/teacher/:id — Get targeted requests for a teacher
    async getForTeacher(req: Request, res: Response): Promise<void> {
        console.log('[RequestController] getForTeacher called', { teacherId: req.params.id });
        try {
            const requests = await requestService.getRequestsForTeacher(req.params.id);
            console.log('[RequestController] getForTeacher success', { teacherId: req.params.id, count: requests.length });
            res.json(requests);
        } catch (error: any) {
            console.error('[RequestController] getForTeacher error', error);
            res.status(500).json({ error: error.message });
        }
    },

    // GET /api/requests/student/:id — Get requests by a student
    async getByStudent(req: Request, res: Response): Promise<void> {
        console.log('[RequestController] getByStudent called', { studentId: req.params.id });
        try {
            const requests = await requestService.getRequestsByStudent(req.params.id);
            console.log('[RequestController] getByStudent success', { studentId: req.params.id, count: requests.length });
            res.json(requests);
        } catch (error: any) {
            console.error('[RequestController] getByStudent error', error);
            res.status(500).json({ error: error.message });
        }
    },

    // PATCH /api/requests/:id/status — Accept or Decline a request
    async updateStatus(req: Request, res: Response): Promise<void> {
        console.log('[RequestController] updateStatus called', { requestId: req.params.id, status: req.body.status, userId: req.user?.uid });
        try {
            const { status } = req.body;
            if (!['accepted', 'declined', 'completed'].includes(status)) {
                console.log('[RequestController] updateStatus failed: invalid status', { status });
                res.status(400).json({ error: 'Invalid status. Use: accepted, declined, completed' });
                return;
            }
            await requestService.updateRequestStatus(req.params.id, status, req.user?.uid);
            console.log('[RequestController] updateStatus success', { requestId: req.params.id, status });
            res.json({ message: `Request ${status}` });
        } catch (error: any) {
            console.error('[RequestController] updateStatus error', error);
            res.status(500).json({ error: error.message });
        }
    },
};
