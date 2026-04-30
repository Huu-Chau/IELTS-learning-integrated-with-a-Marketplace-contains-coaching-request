export class PayForReservationPayload {
    constructor(
        readonly reservationId: number,
        readonly studentId: string,
    ) {}
}
