export class BrowseListingsQuery {
    constructor(
        readonly skill?: string,
        readonly maxPrice?: string | number,
        readonly search?: string
    ) { }
}

export class CreateBookingPayload {
    constructor(
        readonly listingId: number,
        readonly teacherId: string,
        readonly message?: string,
        readonly attemptId?: number
    ) { }
}
