import { WritingTask } from "../ai-types";

export class StartSessionPayload {
    constructor(
        readonly userId: string,
        readonly book: string,
        readonly testNumber: number
    ) { }
}

export class EvaluateEssayPayload {
    constructor(
        readonly essay: string,
        readonly taskNumber: number,
        readonly wordCount: number,
        readonly task: WritingTask,
        readonly userId: string
    ) { }
}
