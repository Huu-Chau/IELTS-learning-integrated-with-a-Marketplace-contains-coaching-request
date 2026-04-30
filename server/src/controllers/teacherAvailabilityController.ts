import { NextFunction, Request, Response } from "express";
import { ITeacherAvailabilityService } from '../services/teacherAvailabilityService';
import { GetAvailabilityParams, CreateAvailabilityPayload, UpdateAvailabilityPayload, BookAvailabilityPayload } from '../types/availability';

export interface ITeacherAvailabilityController {
    getAvailability(req: Request, res: Response, next: NextFunction): Promise<void>;
    createAvailability(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateAvailability(req: Request, res: Response, next: NextFunction): Promise<void>;
    bookAvailability(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class TeacherAvailabilityController implements ITeacherAvailabilityController {
    constructor(private readonly teacherAvailabilityService: ITeacherAvailabilityService) { }

    public async getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { teacherId, from, to } = req.query;
        const params = new GetAvailabilityParams(teacherId as string, new Date(from as string), new Date(to as string));
        const result = await this.teacherAvailabilityService.getAvailability(params);
        res.status(200).json(result);
        return next();
    }

    public async createAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { teacherId, date, startTime, endTime, timezone } = req.body;
        const payload = new CreateAvailabilityPayload(teacherId, date, startTime, endTime, timezone);
        const result = await this.teacherAvailabilityService.createAvailability(payload);
        res.status(201).json(result);
        return next();
    }

    public async updateAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { id } = req.params;
        const { teacherId, date, startTime, endTime, timezone, isAvailable } = req.body;
        const payload = new UpdateAvailabilityPayload(Number(id), teacherId, date, startTime, endTime, timezone, isAvailable);
        const result = await this.teacherAvailabilityService.updateAvailability(payload);
        res.status(200).json(result);
        return next();
    }

    public async bookAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { id } = req.params;
        const studentId = req.user!.uid;
        const { listingId } = req.body;
        const payload = new BookAvailabilityPayload(Number(id), studentId, Number(listingId));
        const result = await this.teacherAvailabilityService.bookAvailability(payload);
        res.status(200).json(result);
        return next();
    }
}