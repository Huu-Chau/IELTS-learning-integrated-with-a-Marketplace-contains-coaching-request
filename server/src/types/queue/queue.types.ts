export class QueueMessage<T> {
    constructor(readonly data: T, readonly metadata?: any) { }
}

export enum QueueTopic {
    ATTEMPT_CREATED = 'attempt.created',
}
