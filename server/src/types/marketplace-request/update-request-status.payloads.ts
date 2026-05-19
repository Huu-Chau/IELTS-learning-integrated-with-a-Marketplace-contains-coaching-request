import { MarketplaceRequestStatus } from './marketplace-request-types';

export class UpdateRequestStatusPayload {
    constructor(
        readonly id: string,
        readonly status: MarketplaceRequestStatus,
        readonly acceptedBy?: string,
    ) { }
}
