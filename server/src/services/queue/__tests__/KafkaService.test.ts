import { KafkaService } from '../KafkaService';
import { Kafka } from 'kafkajs';
import kafkaConfig from '../../../config/kafka';

// Mock kafkajs
jest.mock('kafkajs');

describe('KafkaService', () => {
    let kafkaService: KafkaService;
    let mockKafkaInstance: any;
    let mockProducer: any;
    let mockConsumer: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockProducer = {
            connect: jest.fn().mockResolvedValue(undefined),
            send: jest.fn().mockResolvedValue(undefined),
            disconnect: jest.fn().mockResolvedValue(undefined),
        };

        mockConsumer = {
            connect: jest.fn().mockResolvedValue(undefined),
            subscribe: jest.fn().mockResolvedValue(undefined),
            run: jest.fn().mockResolvedValue(undefined),
            disconnect: jest.fn().mockResolvedValue(undefined),
        };

        mockKafkaInstance = {
            producer: jest.fn().mockReturnValue(mockProducer),
            consumer: jest.fn().mockReturnValue(mockConsumer),
        };

        (Kafka as jest.Mock).mockImplementation(() => mockKafkaInstance);

        kafkaService = new KafkaService();
    });

    describe('constructor', () => {
        it('should initialize Kafka instance and producer', () => {
            expect(Kafka).toHaveBeenCalledWith({
                clientId: kafkaConfig.clientId,
                brokers: kafkaConfig.brokers,
                connectionTimeout: 3000,
                retry: {
                    initialRetryTime: 100,
                    retries: 8
                }
            });
            expect(mockKafkaInstance.producer).toHaveBeenCalled();
        });
    });

    describe('connect', () => {
        it('should connect the producer eagerly', async () => {
            await kafkaService.connect();

            expect(mockProducer.connect).toHaveBeenCalledTimes(1);
        });

        it('should only connect the producer once on multiple connect calls', async () => {
            await kafkaService.connect();
            await kafkaService.connect();

            expect(mockProducer.connect).toHaveBeenCalledTimes(1);
        });

        it('should not reconnect the producer when publishing after connect', async () => {
            await kafkaService.connect();
            await kafkaService.publish({ data: { type: 'test', id: 1 } }, 'test-topic');

            expect(mockProducer.connect).toHaveBeenCalledTimes(1);
            expect(mockProducer.send).toHaveBeenCalledTimes(1);
        });

        it('should reset connection state so a retry can reconnect if connect fails', async () => {
            const error = new Error('Connection failed');
            mockProducer.connect.mockRejectedValueOnce(error);

            await expect(kafkaService.connect()).rejects.toThrow(error);

            // Second attempt should try to connect again (state was reset)
            await kafkaService.connect();
            expect(mockProducer.connect).toHaveBeenCalledTimes(2);
        });
    });

    describe('publish', () => {
        const topic = 'test-topic';
        const message = { data: { type: 'test', id: 1 } };

        it('should connect producer and send message', async () => {
            await kafkaService.publish(message, topic);

            expect(mockProducer.connect).toHaveBeenCalledTimes(1);
            expect(mockProducer.send).toHaveBeenCalledWith({
                topic,
                messages: [{ value: JSON.stringify(message) }],
            });
        });

        it('should only connect producer once on multiple publishes', async () => {
            await kafkaService.publish(message, topic);
            await kafkaService.publish(message, topic);

            expect(mockProducer.connect).toHaveBeenCalledTimes(1);
            expect(mockProducer.send).toHaveBeenCalledTimes(2);
        });

        it('should throw error if producer fails to connect', async () => {
            const error = new Error('Connection failed');
            mockProducer.connect.mockRejectedValue(error);

            await expect(kafkaService.publish(message, topic)).rejects.toThrow(error);
        });

        it('should throw error if producer fails to send', async () => {
            const error = new Error('Send failed');
            mockProducer.send.mockRejectedValue(error);

            await expect(kafkaService.publish(message, topic)).rejects.toThrow(error);
        });
    });

    describe('consume', () => {
        const topic = 'test-topic';
        const domain = 'test-domain';
        const handler = jest.fn();

        it('should create consumer with correct groupId and subscribe', async () => {
            await kafkaService.consume(topic, domain, handler);

            expect(mockKafkaInstance.consumer).toHaveBeenCalledWith({
                groupId: `${domain}-${topic}`
            });
            expect(mockConsumer.connect).toHaveBeenCalled();
            expect(mockConsumer.subscribe).toHaveBeenCalledWith({
                topic,
                fromBeginning: kafkaConfig.fromBeginning
            });
            expect(mockConsumer.run).toHaveBeenCalled();
        });

        it('should reuse consumer for same topic and domain', async () => {
            await kafkaService.consume(topic, domain, handler);
            await kafkaService.consume(topic, domain, handler);

            expect(mockKafkaInstance.consumer).toHaveBeenCalledTimes(1);
        });

        it('should trigger handler when a message is received', async () => {
            await kafkaService.consume(topic, domain, handler);

            // Get the eachMessage callback passed to consumer.run
            const runCall = mockConsumer.run.mock.calls[0][0];
            const eachMessage = runCall.eachMessage;

            const messagePayload = {
                topic,
                partition: 0,
                message: {
                    value: Buffer.from(JSON.stringify({ data: { type: 'test' } })),
                },
            };

            await eachMessage(messagePayload);

            expect(handler).toHaveBeenCalledWith({ data: { type: 'test' } });
        });

        it('should not trigger handler if message value is missing', async () => {
            await kafkaService.consume(topic, domain, handler);

            const runCall = mockConsumer.run.mock.calls[0][0];
            const eachMessage = runCall.eachMessage;

            const messagePayload = {
                topic,
                partition: 0,
                message: {
                    value: null,
                },
            };

            await eachMessage(messagePayload);

            expect(handler).not.toHaveBeenCalled();
        });

        it('should handle JSON parse errors gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await kafkaService.consume(topic, domain, handler);

            const runCall = mockConsumer.run.mock.calls[0][0];
            const eachMessage = runCall.eachMessage;

            const messagePayload = {
                topic,
                partition: 0,
                message: {
                    value: Buffer.from('invalid-json'),
                },
            };

            await eachMessage(messagePayload);

            expect(handler).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[KafkaService] Error processing Kafka message:'),
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });
    });

    describe('disconnect', () => {
        it('should disconnect producer and all consumers', async () => {
            // Setup producer connection
            await kafkaService.publish({ data: { test: 1 } }, 'topic1');
            
            // Setup consumers
            await kafkaService.consume('topic2', 'domain2', jest.fn());
            await kafkaService.consume('topic3', 'domain3', jest.fn());

            await kafkaService.disconnect();

            expect(mockProducer.disconnect).toHaveBeenCalled();
            expect(mockConsumer.disconnect).toHaveBeenCalledTimes(2);
        });

        it('should handle disconnect errors', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await kafkaService.publish({ data: { test: 1 } }, 'topic1');
            
            const error = new Error('Disconnect failed');
            mockProducer.disconnect.mockRejectedValue(error);

            await expect(kafkaService.disconnect()).rejects.toThrow(error);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[KafkaService] ❌ Error during disconnect:'),
                error
            );
            consoleSpy.mockRestore();
        });
    });
});
