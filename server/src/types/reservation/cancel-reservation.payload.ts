export class CancelReservationPayload {
    constructor(
        readonly reservationId: number,
        readonly studentId: string,
    ) {}
}
