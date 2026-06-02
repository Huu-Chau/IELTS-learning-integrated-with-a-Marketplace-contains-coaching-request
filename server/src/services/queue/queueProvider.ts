import { KafkaService } from './KafkaService';
import { IQueueProvider } from './IQueueProvider';

/**
 * Shared singleton queue provider.
 *
 * A single KafkaService instance — and therefore a single producer
 * connection — is reused across the whole process (model hooks, consumers,
 * server startup). This avoids spawning one producer connection per module
 * and lets the connection be warmed up exactly once (see `connect()`).
 */
export const queueService: IQueueProvider = new KafkaService();
