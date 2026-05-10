import { Request, Response, NextFunction } from 'express';
import { IRequestService } from '../services/requestService';
import { UpdateRequestStatusPayload, MarketplaceRequestStatus } from '../types/marketplace-request';

export interface IRequestController {
    getOpen(req: Request, res: Response, next: NextFunction): Promise<void>;
    getForTeacher(req: Request, res: Response, next: NextFunction): Promise<void>;
    getByStudent(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class RequestController implements IRequestController {
    constructor(private requestService: IRequestService) { }

    // GET /api/requests — Get all open requests (Teacher view)
    getOpen = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[RequestController] getOpen called');
        try {
            const requests = await this.requestService.getOpenRequests();
            console.log('[RequestController] getOpen success', { count: requests.length });
            res.json(requests);
            return next();
        } catch (error: any) {
            console.error('[RequestController] getOpen error', error);
            next(error);
        }
    }

    // GET /api/requests/teacher/:id — Get targeted requests for a teacher
    getForTeacher = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[RequestController] getForTeacher called', { teacherId: req.params.id });
        try {
            const requests = await this.requestService.getRequestsForTeacher(req.params.id);
            console.log('[RequestController] getForTeacher success', { teacherId: req.params.id, count: requests.length });
            res.json(requests);
            return next();
        } catch (error: any) {
            console.error('[RequestController] getForTeacher error', error);
            next(error);
        }
    }

    // GET /api/requests/student/:id — Get requests by a student
    getByStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[RequestController] getByStudent called', { studentId: req.params.id });
        try {
            const requests = await this.requestService.getRequestsByStudent(req.params.id);
            console.log('[RequestController] getByStudent success', { studentId: req.params.id, count: requests.length });
            res.json(requests);
            return next();
        } catch (error: any) {
            console.error('[RequestController] getByStudent error', error);
            next(error);
        }
    }

    // PATCH /api/requests/:id/status — Accept or Decline a request
    updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        console.log('[RequestController] updateStatus called', { requestId: req.params.id, status: req.body.status, userId: req.user?.uid });
        try {
            const { status } = req.body;

            // Map legacy 'declined' to 'rejected' if necessary, or just validate against Enum
            let normalizedStatus: MarketplaceRequestStatus;
            if (status === 'declined') {
                normalizedStatus = MarketplaceRequestStatus.REJECTED;
            } else if (Object.values(MarketplaceRequestStatus).includes(status as MarketplaceRequestStatus)) {
                normalizedStatus = status as MarketplaceRequestStatus;
            } else {
                console.log('[RequestController] updateStatus failed: invalid status', { status });
                res.status(400).json({ error: `Invalid status. Use: ${Object.values(MarketplaceRequestStatus).join(', ')}` });
                return;
            }

            const payload = new UpdateRequestStatusPayload(req.params.id, normalizedStatus, req.user?.uid);
            await this.requestService.updateRequestStatus(payload);

            console.log('[RequestController] updateStatus success', { requestId: req.params.id, status: payload.status });
            res.json({ message: `Request ${payload.status}` });
            return next();
        } catch (error: any) {
            console.error('[RequestController] updateStatus error', error);
            next(error);
        }
    }
}
