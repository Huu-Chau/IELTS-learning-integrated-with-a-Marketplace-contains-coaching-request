
export interface IConsumer {
    consume(): Promise<void>;
}

export * from './notification-on-attempt-created';
export * from './notification-on-marketplace-request-status-updated';
export * from './notification-on-writing-session-status-updated';
export * from './notification-on-marketplace-request-created';
export * from './message-on-marketplace-request-status-updated';
