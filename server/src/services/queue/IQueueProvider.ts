import { QueueMessage } from '../../types/queue';

export interface IQueueProvider {
    publish<T>(
        message: QueueMessage<T>,
        topic: string,
        routingKey?: string,
    ): Promise<void>;
    consume<T>(topic: string, domain: string, handler: (message: QueueMessage<T>) => Promise<void>): Promise<void>;
    disconnect?(): Promise<void>;
}
