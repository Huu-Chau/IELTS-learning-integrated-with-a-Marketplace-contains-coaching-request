export class CreateAttemptPayload {
    constructor(
        public userId: string,
        public type: string,
        public testId: string | null,
        public score: number | null,
        public feedback: string | null,
        public answers: any,
        public recordingPath: string | null
    ) {}
}
