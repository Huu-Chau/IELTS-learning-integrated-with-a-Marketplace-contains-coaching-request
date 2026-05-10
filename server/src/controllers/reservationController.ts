import { NextFunction, Request, Response } from "express";
import { IReservationService } from '../services/reservationService';
import { PayForReservationPayload } from '../types/reservation';

export interface IReservationController {
    payForReservation(req: Request, res: Response, next: NextFunction): Promise<void>;
    getReservationStatusByListing(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class ReservationController implements IReservationController {
    constructor(private readonly reservationService: IReservationService) { }

    public async payForReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { reservationId } = req.params;
            const studentId = req.user!.uid;
            const payload = new PayForReservationPayload(Number(reservationId), studentId);
            const result = await this.reservationService.payForReservation(payload);
            res.status(200).json({
                success: true,
                marketplaceRequestId: result.id
            });
            return next();
        } catch (error) {
            return next(error);
        }
    }

    public async getReservationStatusByListing(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { listingId } = req.params;
            const studentId = req.user!.uid;
            const result = await this.reservationService.getReservationStatusByListing(Number(listingId), studentId);
            res.status(200).json(result);
            return next();
        } catch (error) {
            return next(error);
        }
    }
}
