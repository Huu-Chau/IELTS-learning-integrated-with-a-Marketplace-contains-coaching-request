import { Ollama } from 'ollama';
import { v4 as uuidv4 } from 'uuid';
import { WritingPart, WritingTask, EssaySubmission } from '../types/ai-types';
import { getRandomPart1Task, getRandomPart2Task } from './writingQuestionBank';
import { IStorageProvider } from './storage/IStorageProvider';
import WritingSession from '../models/WritingSession';
import { WritingSessionStatus, EvaluateEssayPayload } from '../types/writing-session';

export interface IWritingEvaluationService {
    getRandomTask(part?: WritingPart): WritingTask;
    startSession(userId: string, book: string, testNumber: number): Promise<string>;
    evaluateEssay(sessionId: string, payload: EvaluateEssayPayload, onChunk: (chunk: string) => void): Promise<void>;
    getSessionsByUser(userId: string): Promise<WritingSession[]>;
    getSessionDetails(sessionId: string): Promise<any>;
}

export class WritingEvaluationService implements IWritingEvaluationService {
    private storageProvider: IStorageProvider;
    private OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
    private MODEL_NAME = 'gemma3:12b';

    constructor(storageProvider: IStorageProvider) {
        this.storageProvider = storageProvider;
    }

    getRandomTask(part?: WritingPart): WritingTask {
        let task;
        if (part === 'part1') {
            task = getRandomPart1Task();
        } else if (part === 'part2') {
            task = getRandomPart2Task();
        } else {
            task = Math.random() > 0.5 ? getRandomPart1Task() : getRandomPart2Task();
        }
        return task;
    }

    async startSession(userId: string, book: string, testNumber: number): Promise<string> {
        const existing = await WritingSession.findOne({
            where: { userId, book, testNumber: String(testNumber), status: WritingSessionStatus.IN_PROGRESS },
        });

        if (existing) {
            return existing.id;
        }

        const sessionId = uuidv4();
        const session = await WritingSession.create({
            id: sessionId,
            userId,
            book,
            testNumber,
            status: WritingSessionStatus.IN_PROGRESS,
        });

        return session.id;
    }

    async evaluateEssay(sessionId: string, payload: EvaluateEssayPayload, onChunk: (chunk: string) => void): Promise<void> {
        const { essay, taskNumber, wordCount, task, userId } = payload;
        const part: WritingPart = taskNumber === 1 ? 'part1' : 'part2';

        const submission: EssaySubmission = {
            essay,
            part,
            wordCount,
            task,
        };

        const ollama = new Ollama({ host: this.OLLAMA_HOST });
        const systemPrompt = this.buildSystemPrompt();
        const gradingPrompt = this.buildGradingPrompt(submission);

        const stream = await ollama.chat({
            model: this.MODEL_NAME,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: gradingPrompt },
            ],
            stream: true,
        });

        let fullResponse = '';
        for await (const chunk of stream) {
            const content = chunk.message?.content || '';
            fullResponse += content;
            onChunk(content);
        }

        // Post-evaluation persistence
        try {
            const essayFilename = `sessions/${userId}/${sessionId}/task${taskNumber}-essay.txt`;
            const feedbackFilename = `sessions/${userId}/${sessionId}/task${taskNumber}-feedback.md`;

            await this.storageProvider.uploadFile(essayFilename, Buffer.from(essay, 'utf-8'), 'text/plain');
            await this.storageProvider.uploadFile(feedbackFilename, Buffer.from(fullResponse, 'utf-8'), 'text/markdown');

            let bandScore = null;
            const match = fullResponse.match(/Overall\s*(?:Estimated\s*)?Band\s*(?:Score)?\s*[:=\-–—]\s*\*?\*?(\d+(?:\.\d+)?)\*?\*?/i);
            if (match && match[1]) {
                bandScore = parseFloat(match[1]);
            }

            const sessionRec = await WritingSession.findByPk(sessionId);
            if (sessionRec) {
                if (taskNumber === 1) {
                    sessionRec.task1EssayKey = essayFilename;
                    sessionRec.task1FeedbackKey = feedbackFilename;
                    sessionRec.task1Band = bandScore;
                } else {
                    sessionRec.task2EssayKey = essayFilename;
                    sessionRec.task2FeedbackKey = feedbackFilename;
                    sessionRec.task2Band = bandScore;
                }

                if (sessionRec.task1Band !== null && sessionRec.task2Band !== null && sessionRec.status !== WritingSessionStatus.COMPLETED) {
                    const rawScore = (sessionRec.task1Band + sessionRec.task2Band * 2) / 3;
                    sessionRec.overallBand = Math.round(rawScore * 2) / 2;
                    sessionRec.status = WritingSessionStatus.COMPLETED;
                    sessionRec.endTime = new Date();
                }

                await sessionRec.save();
            }
        } catch (storageErr) {
            console.error('[WritingEvaluationService] Error storing files or updating DB:', storageErr);
        }
    }

    async getSessionsByUser(userId: string): Promise<WritingSession[]> {
        return await WritingSession.findAll({
            where: { userId, status: WritingSessionStatus.COMPLETED },
            order: [['createdAt', 'DESC']],
        });
    }

    async getSessionDetails(sessionId: string): Promise<any> {
        const session = await WritingSession.findByPk(sessionId);
        if (!session) {
            return null;
        }

        const EXPIRY = 900; // seconds
        const urls: Record<string, string | null> = {
            task1EssayUrl: null,
            task1FeedbackUrl: null,
            task2EssayUrl: null,
            task2FeedbackUrl: null,
        };

        if (session.task1EssayKey) {
            urls.task1EssayUrl = await this.storageProvider.getFileUrl(session.task1EssayKey, EXPIRY);
        }
        if (session.task1FeedbackKey) {
            urls.task1FeedbackUrl = await this.storageProvider.getFileUrl(session.task1FeedbackKey, EXPIRY);
        }
        if (session.task2EssayKey) {
            urls.task2EssayUrl = await this.storageProvider.getFileUrl(session.task2EssayKey, EXPIRY);
        }
        if (session.task2FeedbackKey) {
            urls.task2FeedbackUrl = await this.storageProvider.getFileUrl(session.task2FeedbackKey, EXPIRY);
        }

        return {
            ...session.toJSON(),
            ...urls,
        };
    }

    private buildSystemPrompt(): string {
        return `You are a certified IELTS Writing examiner with 15+ years of experience. Your role is to evaluate IELTS Writing essays and provide detailed band score assessments.

## Rules
- You are an EXAMINER, not a tutor. Provide objective, professional assessments.
- Grade strictly according to the official IELTS Writing Band Descriptors.
- Be specific: always cite EXACT phrases or sentences from the essay as evidence.
- Be honest: do not inflate scores. A Band 5 essay is a Band 5 essay.
- NEVER rewrite the essay. Only evaluate what was written.
- NEVER include stage directions, actions, or narration in parentheses (), asterisks **, or brackets [].`;
    }

    private buildGradingPrompt(submission: EssaySubmission): string {
        const partLabel = submission.part === 'part1' ? 'Part 1' : 'Part 2';
        const minWords = submission.part === 'part1' ? 150 : 250;
        const criterion1Name = submission.part === 'part1' ? 'Task Achievement' : 'Task Response';
        const criterion1Desc =
            submission.part === 'part1'
                ? 'How well does the response address the task? Does it accurately DESCRIBE what the data shows and SUMMARISE comparisons where relevant? The writing style MUST be formal or neutral — penalise informal or conversational tone.'
                : 'How well does the response address all parts of the task? Does it present a clear position? Are ideas well-developed with relevant examples? The writing style MUST be academic or semi-formal.';

        return `You are evaluating an IELTS Writing ${partLabel} essay.

## The Task Given to the Student
"""
${submission.task.prompt}
"""
${submission.task.dataDescription ? `\n## Data/Chart Description\n"""\n${submission.task.dataDescription}\n"""` : ''}

## The Student's Essay (${submission.wordCount} words)
"""
${submission.essay}
"""

## Word Count Analysis
- Required minimum: ${minWords} words
- Actual count: ${submission.wordCount} words
- ${submission.wordCount < minWords ? `⚠️ UNDER MINIMUM by ${minWords - submission.wordCount} words — this MUST negatively impact the Task ${submission.part === 'part1' ? 'Achievement' : 'Response'} score.` : '✅ Meets minimum word count requirement.'}

## Evaluation Instructions & Official Rubric

Grade the essay strictly against this official IELTS Band rubric (Bands 6-9):

**Band 6 (Competent):**
- Task: Addresses task parts but some ideas lack development.
- Coherence: Clear overall progression. Cohesive devices may be mechanical or faulty.
- Lexical: Adequate vocabulary. Attempts less common words with some inaccuracy.
- Grammar: Mix of simple and complex forms. Frequent minor errors.

**Band 7 (Good):**
- Task: Covers requirements well. Main ideas extended but may overgeneralise.
- Coherence: Logically organised. Range of cohesive devices used flexibly.
- Lexical: Less common/idiomatic items with awareness of style. Occasional errors.
- Grammar: Variety of complex structures. Frequent error-free sentences.

**Band 8 (Very Good):**
- Task: Covers all requirements sufficiently. Ideas well-extended and supported.
- Coherence: Logically sequenced. Cohesion is well-managed. Occasional lapses.
- Lexical: Fluent, flexible use. Skillful use of uncommon items.
- Grammar: Wide range of structures. Majority of sentences are completely error-free.

**Band 9 (Expert):**
- Task: Fully developed, explored in depth.
- Coherence: Effortless progression. Paragraphing skillfully managed.
- Lexical: Natural, sophisticated control. Rare slips.
- Grammar: Full flexibility. Errors are extremely rare.

Using the rubric above, evaluate across the 4 criteria:

### 1. ${criterion1Name}
${criterion1Desc}

### 2. Coherence & Cohesion
How well is the essay organised? Are cohesive devices used appropriately and not mechanically?

### 3. Lexical Resource
How varied and precise is the vocabulary? Are there errors in word choice or spelling?

### 4. Grammatical Range & Accuracy
How varied are the sentence structures? Are there frequent or rare grammatical errors?

---

For EACH criterion, provide:
1. **Band Score** (1–9, can use .5 increments like 6.5)
2. **Strength**: One specific strength with a DIRECT QUOTE from the essay
3. **Improvement**: One specific weakness with a DIRECT QUOTE and how to fix it

After all 4 criteria, provide:
- **Overall Band Score**: The average of the 4 criteria (rounded to nearest 0.5)
- **Examiner's Summary**: 2-3 sentences of overall feedback and the most impactful thing the student should work on.

Format your response clearly with headers and bullet points.`;
    }
}
