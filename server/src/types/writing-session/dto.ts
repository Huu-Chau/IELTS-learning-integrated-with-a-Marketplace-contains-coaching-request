import { WritingTask } from "../ai-types";

export class StartSessionPayload {
    userId: string;
    book: string;
    testNumber: number;

    constructor(userId: string, book: string, testNumber: number) {
        this.userId = userId;
        this.book = book;
        this.testNumber = testNumber;
    }
}

export class EvaluateEssayPayload {
    essay: string;
    taskNumber: number;
    wordCount: number;
    task: WritingTask;
    userId: string;

    constructor(essay: string, taskNumber: number, wordCount: number, task: WritingTask, userId: string) {
        this.essay = essay;
        this.taskNumber = taskNumber;
        this.wordCount = wordCount;
        this.task = task;
        this.userId = userId;
    }
}
