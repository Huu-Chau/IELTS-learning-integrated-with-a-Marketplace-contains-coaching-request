export class BookAvailabilityPayload {
    constructor(
        readonly availabilityId: number,
        readonly studentId: string,
        readonly listingId: number,
    ) {}
}