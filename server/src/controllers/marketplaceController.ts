import { Request, Response, NextFunction } from 'express';
import { IMarketplaceService } from '../services/marketplaceService';
import { ITeacherAvailabilityService } from '../services/teacherAvailabilityService';
import { BrowseListingsQuery, CreateBookingPayload } from '../types/marketplace';
import { GetAvailabilityParams } from '../types/availability';

export interface IMarketplaceController {
    getListings(req: Request, res: Response, next: NextFunction): Promise<void>;
    getListingById(req: Request, res: Response, next: NextFunction): Promise<void>;
    createBooking(req: Request, res: Response, next: NextFunction): Promise<void>;
    getStudentRequests(req: Request, res: Response, next: NextFunction): Promise<void>;
    getStudentPayments(req: Request, res: Response, next: NextFunction): Promise<void>;
    getTeacherAvailability(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class MarketplaceController implements IMarketplaceController {
    constructor(
        private marketplaceService: IMarketplaceService,
        private teacherAvailabilityService: ITeacherAvailabilityService
    ) {}

    async getListings(req: Request, res: Response, next: NextFunction): Promise<void> {
        console.log('[MarketplaceController] getListings called', { uid: req.user?.uid, query: req.query });
        try {
            const { skill, maxPrice, search } = req.query;
            const query = new BrowseListingsQuery(
                skill as string,
                maxPrice as string,
                search as string
            );

            const listings = await this.marketplaceService.getListings(query, req.user?.uid);
            res.json(listings);
            return next();
        } catch (error) {
            console.error('[MarketplaceController] getListings error', error);
            return next(error);
        }
    }

    async getListingById(req: Request, res: Response, next: NextFunction): Promise<void> {
        console.log('[MarketplaceController] getListingById called', { id: req.params.id, uid: req.user?.uid });
        try {
            const listing = await this.marketplaceService.getListingById(req.params.id);
            if (!listing) {
                res.status(404).json({ error: 'Listing not found' });
                return;
            }
            res.json(listing);
            return next();
        } catch (error) {
            console.error('[MarketplaceController] getListingById error', error);
            return next(error);
        }
    }

    async createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
        console.log('[MarketplaceController] createBooking called', { uid: req.user?.uid, body: req.body });
        try {
            const studentId = req.user!.uid;
            const { listingId, teacherId, message, attemptId } = req.body;

            if (!listingId || !teacherId) {
                res.status(400).json({ error: 'listingId and teacherId are required' });
                return;
            }

            const payload = new CreateBookingPayload(
                Number(listingId),
                teacherId,
                message,
                attemptId ? Number(attemptId) : undefined
            );

            const result = await this.marketplaceService.createBooking(studentId, payload);
            res.status(201).json(result);
            return next();
        } catch (error: any) {
            console.error('[MarketplaceController] createBooking error', error);
            if (error.message.includes('already have a pending request') || error.message.includes('Listing not found')) {
                res.status(error.message.includes('not found') ? 404 : 400).json({ error: error.message });
                return;
            }
            return next(error);
        }
    }

    async getStudentRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
        console.log('[MarketplaceController] getStudentRequests called', { uid: req.user?.uid });
        try {
            const studentId = req.user!.uid;
            const requests = await this.marketplaceService.getStudentRequests(studentId);
            res.json(requests);
            return next();
        } catch (error) {
            console.error('[MarketplaceController] getStudentRequests error', error);
            return next(error);
        }
    }

    async getStudentPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
        console.log('[MarketplaceController] getStudentPayments called', { uid: req.user?.uid });
        try {
            const studentId = req.user!.uid;
            const result = await this.marketplaceService.getStudentPayments(studentId);
            res.json(result);
            return next();
        } catch (error) {
            console.error('[MarketplaceController] getStudentPayments error', error);
            return next(error);
        }
    }

    async getTeacherAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
        console.log('[MarketplaceController] getTeacherAvailability called', { uid: req.params.uid });
        try {
            const teacherId = req.params.uid;
            const now = new Date();
            const next14Days = new Date(new Date().setDate(now.getDate() + 14));
            
            const params = new GetAvailabilityParams(teacherId, now, next14Days);
            const availability = await this.teacherAvailabilityService.getAvailability(params);

            res.json({ slots: availability });
            return next();
        } catch (error) {
            console.error('[MarketplaceController] getTeacherAvailability error', error);
            return next(error);
        }
    }
}
