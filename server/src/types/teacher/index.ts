import { MarketplaceRequestStatus } from '../marketplace-request';

export class CreateListingPayload {
    constructor(
        public readonly title: string,
        public readonly description: string,
        public readonly skills: string[],
        public readonly pricePerHour: number,
        public readonly sessionDuration: number = 60,
        public readonly teacherId: string
    ) {}
}

export class UpdateListingPayload {
    constructor(
        public readonly id: string,
        public readonly title?: string,
        public readonly description?: string,
        public readonly skills?: string[],
        public readonly pricePerHour?: number,
        public readonly sessionDuration?: number,
        public readonly isActive?: boolean,
        public readonly teacherId?: string
    ) {}
}

export class UpdateOrderPayload {
    constructor(
        public readonly id: string,
        public readonly teacherId: string,
        public readonly status: MarketplaceRequestStatus,
        public readonly feedbackPath?: string
    ) {}
}

export class WithdrawPayload {
    constructor(
        public readonly teacherId: string,
        public readonly amount: number
    ) {}
}

export class UpdateAvailabilityRulesPayload {
    constructor(
        public readonly teacherId: string,
        public readonly rules: { dayOfWeek: number; startTime: string; endTime: string }[]
    ) {}
}
