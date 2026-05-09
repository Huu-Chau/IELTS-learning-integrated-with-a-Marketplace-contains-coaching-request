export class GradeTestPayload {
    skill: string;
    book: string;
    testNumber: number;
    answers: Record<string, string>;

    constructor(skill: string, book: string, testNumber: number, answers: Record<string, string>) {
        this.skill = skill;
        this.book = book;
        this.testNumber = testNumber;
        this.answers = answers;
    }
}
