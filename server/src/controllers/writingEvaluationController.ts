/**
 * Writing Evaluation Controller
 *
 * Handles IELTS Writing evaluation requests via the REST API.
 * Ports the Evaluator class from Gemma_W/src/evaluator.ts into
 * a stateless Express controller that:
 *   - GET  /api/evaluate/writing/task  → returns a random task
 *   - POST /api/evaluate/writing       → streams an SSE evaluation
 */

import { Request, Response } from 'express';
import { Ollama } from 'ollama';
import { v4 as uuidv4 } from 'uuid';
import { EssaySubmission, WritingPart } from '../types/ai-types';
import { getRandomPart1Task, getRandomPart2Task } from '../services/writingQuestionBank';
import { storageProvider } from '../services/storage/StorageService';
import WritingSession from '../models/WritingSession';
import Notification from '../models/Notification';

// ─── Configuration ─────────────────────────────────────────────────────────

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL_NAME = 'gemma3:12b';

// ─── System Prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
    console.log('[WritingEvaluationController] buildSystemPrompt called');
    return `You are a certified IELTS Writing examiner with 15+ years of experience. Your role is to evaluate IELTS Writing essays and provide detailed band score assessments.

## Rules
- You are an EXAMINER, not a tutor. Provide objective, professional assessments.
- Grade strictly according to the official IELTS Writing Band Descriptors.
- Be specific: always cite EXACT phrases or sentences from the essay as evidence.
- Be honest: do not inflate scores. A Band 5 essay is a Band 5 essay.
- NEVER rewrite the essay. Only evaluate what was written.
- NEVER include stage directions, actions, or narration in parentheses (), asterisks **, or brackets [].`;
}

// ─── Grading Prompt ─────────────────────────────────────────────────────────

function buildGradingPrompt(submission: EssaySubmission): string {
    console.log('[WritingEvaluationController] buildGradingPrompt called', {
        part: submission.part,
        wordCount: submission.wordCount,
    });

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

// ─── Controller Functions ────────────────────────────────────────────────────

/**
 * GET /api/evaluate/writing/task?part=part1|part2
 * Returns a randomly selected writing task.
 */
export const getTask = (req: Request, res: Response): void => {
    console.log('[WritingEvaluationController] getTask called', { part: req.query.part });
    try {
        const part = req.query.part as WritingPart;
        let task;
        if (part === 'part1') {
            task = getRandomPart1Task();
        } else if (part === 'part2') {
            task = getRandomPart2Task();
        } else {
            // Default: randomly pick part1 or part2
            task = Math.random() > 0.5 ? getRandomPart1Task() : getRandomPart2Task();
        }
        console.log('[WritingEvaluationController] getTask success', { taskType: task.taskType });
        res.json(task);
    } catch (error) {
        console.error('[WritingEvaluationController] getTask error', error);
        res.status(500).json({ error: 'Failed to load writing task.' });
    }
};

/**
 * POST /api/evaluate/writing/start
 * Initializes a new WritingSession and returns the sessionId.
 * Body: { userId, book, testNumber }
 */
export const startSession = async (req: Request, res: Response): Promise<void> => {
    console.log('[WritingEvaluationController] startSession called', req.body);
    try {
        const { userId, book, testNumber } = req.body;

        if (!userId || !book || testNumber === undefined) {
            res.status(400).json({ error: 'Missing required fields: userId, book, testNumber.' });
            return;
        }

        // Ensure WritingSession table exists (useful during dev)
        // await WritingSession.sync();

        // ── Idempotency: reuse existing in-progress session rather than creating a new orphan ──
        const existing = await WritingSession.findOne({
            where: { userId, book, testNumber: String(testNumber), status: 'in-progress' },
        });

        if (existing) {
            console.log('[WritingEvaluationController] startSession reusing existing in-progress session', { sessionId: existing.id });
            res.json({ sessionId: existing.id });
            return;
        }

        const sessionId = uuidv4();

        const session = await WritingSession.create({
            id: sessionId,
            userId,
            book,
            testNumber,
            status: 'in-progress',
        });

        console.log('[WritingEvaluationController] startSession success', { sessionId });
        res.json({ sessionId: session.id });
    } catch (error) {
        console.error('[WritingEvaluationController] startSession error', error);
        res.status(500).json({ error: 'Failed to start writing session.' });
    }
};

/**
 * POST /api/evaluate/writing/:sessionId/evaluate
 * Evaluates an essay submission. Streams the response as SSE.
 * Saves the raw essay and parsed feedback to MinIO.
 * Updates the WritingSession DB row.
 *
 * Body: { essay: string, taskNumber: 1|2, wordCount: number, task: WritingTask, userId: string }
 */
export const evaluateEssay = async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const { essay, taskNumber, wordCount, task, userId } = req.body;

    console.log('[WritingEvaluationController] evaluateEssay called', {
        sessionId,
        taskNumber,
        wordCount,
    });

    const part: WritingPart = taskNumber === 1 ? 'part1' : 'part2';

    const submission: EssaySubmission = {
        essay,
        part,
        wordCount,
        task,
    };

    if (!essay || !taskNumber || !task || !sessionId || !userId) {
        res.status(400).json({ error: 'Missing required fields: essay, taskNumber, task, sessionId, userId.' });
        return;
    }

    // Set SSE headers for streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        const ollama = new Ollama({ host: OLLAMA_HOST });
        const systemPrompt = buildSystemPrompt();
        const gradingPrompt = buildGradingPrompt(submission);

        const stream = await ollama.chat({
            model: MODEL_NAME,
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
            // SSE format: "data: <json>\n\n"
            res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
        }

        // Post-evaluation persistence 
        try {
            console.log(`[WritingEvaluationController] Saving essay array and feedback to MinIO for session: ${sessionId}`);
            const essayFilename = `sessions/${userId}/${sessionId}/task${taskNumber}-essay.txt`;
            const feedbackFilename = `sessions/${userId}/${sessionId}/task${taskNumber}-feedback.md`;

            // 1. Upload Essay to MinIO
            await storageProvider.uploadFile(essayFilename, Buffer.from(essay, 'utf-8'), 'text/plain');

            // 2. Upload Feedback to MinIO
            await storageProvider.uploadFile(feedbackFilename, Buffer.from(fullResponse, 'utf-8'), 'text/markdown');

            // 3. Extract Band Score (basic regex, similar to Speaking)
            let bandScore = null;
            const match = fullResponse.match(/Overall\s*(?:Estimated\s*)?Band\s*(?:Score)?\s*[:=\-–—]\s*\*?\*?(\d+(?:\.\d+)?)\*?\*?/i);
            if (match && match[1]) {
                bandScore = parseFloat(match[1]);
            }

            // 4. Update Database
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

                // If both tasks are complete, compute overall band & set complete
                if (sessionRec.task1Band !== null && sessionRec.task2Band !== null && sessionRec.status !== 'completed') {
                    // Task 2 is worth roughly 2/3 of the score, Task 1 is 1/3
                    const rawScore = (sessionRec.task1Band + sessionRec.task2Band * 2) / 3;
                    // Round to nearest 0.5
                    sessionRec.overallBand = Math.round(rawScore * 2) / 2;
                    sessionRec.status = 'completed';
                    sessionRec.endTime = new Date();

                    // Create System Notification
                    try {
                        await Notification.create({
                            userId: userId,
                            type: 'system',
                            title: 'Writing Evaluation Complete 🎉',
                            body: `Your IELTS Writing mock test for ${sessionRec.book} Test ${sessionRec.testNumber} has been fully evaluated. Click here to view your band score and detailed feedback!`,
                            linkPath: '/progress',  // Could link directly to details if UI supports opening modal via URL
                        });
                        console.log(`[WritingEvaluationController] Notification created for user ${userId}`);
                    } catch (notifErr) {
                        console.error('[WritingEvaluationController] Failed to create notification:', notifErr);
                    }
                }

                await sessionRec.save();
                console.log(`[WritingEvaluationController] Successfully updated WritingSession ${sessionId}`);
            } else {
                console.warn(`[WritingEvaluationController] Session ${sessionId} not found in DB to update`);
            }
        } catch (storageErr) {
            console.error('[WritingEvaluationController] Error storing files or updating DB:', storageErr);
            // Non-fatal, stream still succeeded
        }

        // Signal completion
        res.write(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`);
        res.end();
        console.log('[WritingEvaluationController] evaluateEssay success', {
            responseLength: fullResponse.length,
        });
    } catch (error) {
        console.error('[WritingEvaluationController] evaluateEssay error', error);
        res.write(`data: ${JSON.stringify({ error: 'Evaluation failed. Is Ollama running?' })}\n\n`);
        res.end();
    }
};

/**
 * GET /api/evaluate/writing/user/:userId
 * Returns all WritingSessions for a given userId, ordered newest-first.
 * Used by the Dashboard Progress page to populate the Result History table.
 */
export const getSessionsByUser = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    console.log('[WritingEvaluationController] getSessionsByUser called', { userId });

    try {
        // Only return completed sessions — in-progress sessions are abandoned/orphaned
        // and have no score or feedback to display.
        const sessions = await WritingSession.findAll({
            where: { userId, status: 'completed' },
            order: [['createdAt', 'DESC']],
        });

        console.log('[WritingEvaluationController] getSessionsByUser success', { count: sessions.length });
        res.json(sessions);
    } catch (error) {
        console.error('[WritingEvaluationController] getSessionsByUser error', error);
        res.status(500).json({ error: 'Failed to fetch writing sessions.' });
    }
};

/**
 * GET /api/evaluate/writing/session/:sessionId/details
 * Returns a single WritingSession with short-lived presigned MinIO URLs
 * for the essay and feedback files. The frontend can fetch the raw text
 * directly from these URLs without burdening the Node.js server.
 */
export const getSessionDetails = async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    console.log('[WritingEvaluationController] getSessionDetails called', { sessionId });

    try {
        const session = await WritingSession.findByPk(sessionId);
        if (!session) {
            console.warn('[WritingEvaluationController] getSessionDetails: session not found', { sessionId });
            res.status(404).json({ error: 'Session not found.' });
            return;
        }

        // Generate presigned URLs for each stored file (15 min expiry)
        const EXPIRY = 900; // seconds
        const urls: Record<string, string | null> = {
            task1EssayUrl: null,
            task1FeedbackUrl: null,
            task2EssayUrl: null,
            task2FeedbackUrl: null,
        };

        if (session.task1EssayKey) {
            urls.task1EssayUrl = await storageProvider.getFileUrl(session.task1EssayKey, EXPIRY);
        }
        if (session.task1FeedbackKey) {
            urls.task1FeedbackUrl = await storageProvider.getFileUrl(session.task1FeedbackKey, EXPIRY);
        }
        if (session.task2EssayKey) {
            urls.task2EssayUrl = await storageProvider.getFileUrl(session.task2EssayKey, EXPIRY);
        }
        if (session.task2FeedbackKey) {
            urls.task2FeedbackUrl = await storageProvider.getFileUrl(session.task2FeedbackKey, EXPIRY);
        }

        const result = {
            ...session.toJSON(),
            ...urls,
        };

        console.log('[WritingEvaluationController] getSessionDetails success', { sessionId, hasUrls: Object.values(urls).filter(Boolean).length });
        res.json(result);
    } catch (error) {
        console.error('[WritingEvaluationController] getSessionDetails error', error);
        res.status(500).json({ error: 'Failed to fetch session details.' });
    }
};
