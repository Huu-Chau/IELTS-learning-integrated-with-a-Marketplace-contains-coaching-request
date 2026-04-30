export class DeleteAvailabilityPayload {
    constructor(
        readonly id: number,
        readonly teacherId: string
    ) { }
}