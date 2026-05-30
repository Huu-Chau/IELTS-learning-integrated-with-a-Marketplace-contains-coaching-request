import { NextFunction, Request, Response } from "express";
import { IReservationService } from '../services/reservationService';
import { PayForReservationPayload } from '../types/reservation';

export interface IReservationController {
    payForReservation(req: Request, res: Response, next: NextFunction): Promise<void>;
    getReservationStatusByListing(req: Request, res: Response, next: NextFunction): Promise<void>;
    getReservationById(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class ReservationController implements IReservationController {
    constructor(private readonly reservationService: IReservationService) { }

    public async payForReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
        console.log('[ReservationController] payForReservation called', { reservationId: req.params.reservationId });
        try {
            const { reservationId } = req.params;
            const studentId = req.user!.uid;
            const payload = new PayForReservationPayload(Number(reservationId), studentId);
            const result = await this.reservationService.payForReservation(payload);

            // Emit new_notification to both student and teacher rooms so their
            // notification pages refetch without requiring a manual page refresh.
            // The consumer process writes the notification to DB asynchronously;
            // the frontend adds a small delay before refetching to let it land.
            const io = req.app.get('io');
            if (io && result.teacherId) {
                io.to(studentId).emit('new_notification');
                io.to(result.teacherId).emit('new_notification');
                console.log('[ReservationController] payForReservation emitted new_notification', {
                    studentId,
                    teacherId: result.teacherId,
                });
            }

            console.log('[ReservationController] payForReservation success', { id: result.id });
            res.status(200).json({
                success: true,
                marketplaceRequestId: result.id
            });
            return next();
        } catch (error) {
            console.error('[ReservationController] payForReservation error', error);
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

    public async getReservationById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { reservationId } = req.params;
            const studentId = req.user!.uid;
            const result = await this.reservationService.getReservationById(Number(reservationId), studentId);
            if (!result) {
                res.status(404).json({ message: 'Reservation not found' });
                return next();
            }
            res.status(200).json(result);
            return next();
        } catch (error) {
            return next(error);
        }
    }
}
