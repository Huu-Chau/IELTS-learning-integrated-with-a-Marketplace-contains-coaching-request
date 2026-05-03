import { QueueMessage } from '../../types/queue';

export interface IQueueProvider {
    publish(
        message: QueueMessage<any>,
        topic: string,
        routingKey?: string,
    ): Promise<void>;
    consume(topic: string, domain: string, handler: (message: QueueMessage<any>) => Promise<void>): Promise<void>;
}
