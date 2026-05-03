import { MessageType } from './message.types';

export class CreateMessagePayload {
    public constructor(
        public conversationId: string,
        public senderId: string,
        public receiverId: string,
        public content: string,
        public type: MessageType,
    ) { }
}