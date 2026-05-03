export class QueueMessage<T> {
    constructor(readonly data: T, readonly metadata?: any) { }
}

export enum QueueTopic {
    ATTEMPT_CREATED = 'attempt.created',
    MARKETPLACE_REQUEST_CREATED = 'marketplace.request.created',
    MARKETPLACE_REQUEST_STATUS_UPDATED = 'marketplace.request.status.updated',
}
