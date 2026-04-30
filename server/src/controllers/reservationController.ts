import { NextFunction, Request, Response } from "express";
import { IReservationService } from '../services/reservationService';
import { PayForReservationPayload } from '../types/reservation';

export interface IReservationController {
    payForReservation(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class ReservationController implements IReservationController {
    constructor(private readonly reservationService: IReservationService) { }

    public async payForReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { reservationId } = req.params;
        const studentId = req.user!.uid;
        const payload = new PayForReservationPayload(Number(reservationId), studentId);
        const result = await this.reservationService.payForReservation(payload);
        res.status(200).json({
            success: true,
            marketplaceRequestId: result.id
        });
        return next();
    }
}
