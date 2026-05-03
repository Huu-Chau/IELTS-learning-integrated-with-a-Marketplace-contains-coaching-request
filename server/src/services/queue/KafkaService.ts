import { Consumer, Kafka, Producer } from 'kafkajs'
import { IQueueProvider } from "./IQueueProvider";
import { QueueMessage } from "../../types/queue";
import kafkaConfig from '../../config/kafka';

export class KafkaService implements IQueueProvider {
    private kafka: Kafka;
    private producer: Producer;
    private producerConnectPromise: Promise<void> | null = null;
    private consumerMapper: Map<string, Consumer> = new Map();

    constructor() {
        this.kafka = new Kafka({
            clientId: kafkaConfig.clientId,
            brokers: kafkaConfig.brokers,
            connectionTimeout: 3000,
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });
        this.producer = this.kafka.producer();
    }

    private buildGroupId(topic: string, domain: string): string {
        return `${domain}-${topic}`;
    }

    private getConsumer(topic: string, domain: string): Consumer {
        const groupId = this.buildGroupId(topic, domain);
        if (this.consumerMapper.has(groupId)) {
            return this.consumerMapper.get(groupId)!;
        }
        const consumer = this.kafka.consumer({ groupId });
        this.consumerMapper.set(groupId, consumer);
        return consumer;
    }

    private async ensureProducerConnected(): Promise<void> {
        if (!this.producerConnectPromise) {
            this.producerConnectPromise = this.producer.connect().catch((err: any) => {
                this.producerConnectPromise = null;
                console.log('[KafkaService] Failed to connect to Kafka:', err);
                throw err;
            });
        }

        return this.producerConnectPromise;
    }

    private async ensureConsumerConnected(consumer: Consumer, topic: string): Promise<void> {
        await consumer.connect();
        await consumer.subscribe({ topic, fromBeginning: kafkaConfig.fromBeginning });
    }

    async publish<T>(message: QueueMessage<T>, topic: string): Promise<void> {
        try {
            await this.ensureProducerConnected();
            await this.producer.send({
                topic,
                messages: [{ value: JSON.stringify(message) }],
            });
        } catch (error) {
            console.error('[KafkaService] Failed to send Kafka message:', error);
            throw error;
        }
    }

    async consume<T>(topic: string, domain: string, handler: (message: QueueMessage<T>) => Promise<void>): Promise<void> {
        const consumer = this.getConsumer(topic, domain);

        await this.ensureConsumerConnected(consumer, topic);

        await consumer.run({
            eachMessage: async ({ message }) => {
                if (!message.value) {
                    return;
                }
                try {
                    const parsedMessage: QueueMessage<T> = JSON.parse(message.value.toString());
                    await handler(parsedMessage);
                } catch (error) {
                    console.error('[KafkaService] Error processing Kafka message:', error);
                }
            },
        });
    }

    async disconnect(): Promise<void> {
        try {
            const disconnectPromises: Promise<void>[] = [];
            if (this.producerConnectPromise) {
                disconnectPromises.push(this.producer.disconnect());
            }
            for (const consumer of this.consumerMapper.values()) {
                disconnectPromises.push(consumer.disconnect());
            }
            await Promise.all(disconnectPromises);
            console.log('[KafkaService] ✅ Disconnected from Kafka successfully');
        } catch (error) {
            console.error('[KafkaService] ❌ Error during disconnect:', error);
            throw error;
        }
    }
}