export class QueueMessage<T> {
    constructor(readonly data: T, readonly metadata?: any) { }
}
