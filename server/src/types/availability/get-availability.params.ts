export class GetAvailabilityParams {
    constructor(
        readonly teacherId: string,
        readonly from?: Date,
        readonly to?: Date,
    ) { }
}
