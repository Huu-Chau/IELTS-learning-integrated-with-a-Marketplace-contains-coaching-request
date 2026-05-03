import dotenv from 'dotenv';
dotenv.config();

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (!value) return defaultValue
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

const kafkaConfig = {
    clientId: process.env.KAFKA_CLIENT_ID || 'ielts-app',
    brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    // notificationGroupId: process.env.KAFKA_NOTIFICATION_GROUP_ID || 'ielts-app-notification-consumer',
    fromBeginning: parseBoolean(process.env.KAFKA_FROM_BEGINNING, false),
}

export default kafkaConfig