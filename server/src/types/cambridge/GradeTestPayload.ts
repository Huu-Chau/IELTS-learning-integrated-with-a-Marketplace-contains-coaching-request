export class GradeTestPayload {
    constructor(
        readonly skill: string,
        readonly book: string,
        readonly testNumber: number,
        readonly answers: Record<string, string>
    ) { }
}
