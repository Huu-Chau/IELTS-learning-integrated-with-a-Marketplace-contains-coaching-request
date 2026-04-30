export class CreateAvailabilityPayload {
    constructor(
        readonly teacherId: string,
        readonly date: string,
        readonly startTime: string,
        readonly endTime: string,
        readonly timezone: string,
    ) {}
}