/**
 * Shared AI Type Definitions
 *
 * Unified types for both the Writing Evaluator (Gemma_W) and
 * Speaking Examiner (Gemma_S) integrations.
 */

// ─── Shared ──────────────────────────────────────────────────────────────────

/** A single message in the Ollama chat history format. */
export interface ConversationMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// ─── Writing Agent Types ─────────────────────────────────────────────────────

/** Which IELTS Writing part this task belongs to. */
export type WritingPart = 'part1' | 'part2';

/** An IELTS Writing task (question prompt). */
export interface WritingTask {
    /** Part 1 or Part 2 */
    part: WritingPart;
    /** The task type (e.g., "Line Graph", "Opinion Essay") */
    taskType: string;
    /** The full question/prompt text shown to the student */
    prompt: string;
    /** For Part 1: textual description of the data/chart */
    dataDescription?: string;
}

/** A student's submitted essay for one part. */
export interface EssaySubmission {
    /** Which part this essay is for */
    part: WritingPart;
    /** The writing task that was assigned */
    task: WritingTask;
    /** The student's essay text */
    essay: string;
    /** Word count of the essay */
    wordCount: number;
}

/** Band score for a single IELTS Writing criterion. */
export interface BandScore {
    criterion: string;
    score: number;
    strength: string;
    improvement: string;
}

/** Full evaluation result for one or more essay submissions. */
export interface EvaluationResult {
    criteria: BandScore[];
    overallBand: number;
    generalFeedback: string;
}

// ─── Speaking Agent Types ─────────────────────────────────────────────────────

/** Fluency metrics extracted from Whisper word-level timestamps. */
export interface FluencyMetrics {
    wordsPerMinute: number;
    pauseCount: number;
    avgPauseDuration: number;
    longestPause: number;
    audioDuration: number;
    wordCount: number;
}

/** Result from the STT service (one transcription turn). */
export interface TranscriptionResult {
    text: string;
    fluency: FluencyMetrics | null;
}

/** IELTS exam topic covering Parts 1, 2, 3. */
export interface ExamTopic {
    part1Theme: string;
    part1Questions: string[];
    part2Card: string;
    part3Theme: string;
}

