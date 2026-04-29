export class UpdateAvailabilityPayload {
    constructor(
        readonly id: number,
        readonly teacherId: string,
        readonly date: string,
        readonly startTime: string,
        readonly endTime: string,
        readonly timezone: string,
        readonly isAvailable: boolean,
    ) { }
}