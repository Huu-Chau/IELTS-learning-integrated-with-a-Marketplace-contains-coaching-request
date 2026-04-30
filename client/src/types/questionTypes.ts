/**
 * questionTypes.ts
 *
 * Shared TypeScript interfaces for the Cambridge IELTS JSON data structures.
 * Used by both Listening and Reading session pages and question components.
 */

// ── Shared answer map ────────────────────────────────────────────────────────
export type AnswerMap = Record<string, string>;

// ── Individual question ──────────────────────────────────────────────────────
export interface Question {
    question_number: number | string;
    question_text?: string;
    answer_type?: string;
    answer_format?: string;
    options?: Record<string, string>;
    answer: string | null;
}

// ── Sub-section within a part / passage ──────────────────────────────────────
export interface SubSection {
    questions_range?: string;
    question_type?: string;          // reading JSON uses this
    answer_type?: string;            // listening JSON sometimes has this at sub-section level
    instructions: string;
    question_text?: string;          // shared stem (e.g. multi-select)
    question_stem?: string;          // reading uses this for multi-select
    content?: Record<string, unknown>;
    options?: Record<string, string>;
    questions: Question[];
}

// ── Listening ────────────────────────────────────────────────────────────────
export interface ListeningPart {
    part: number;
    audioUrl?: string;
    questions_range: string;
    instructions?: string;
    content?: Record<string, unknown>;
    sub_sections?: SubSection[];
    questions?: Question[];
}

export interface ListeningTest {
    test_number: number;
    test_name: string;
    parts: ListeningPart[];
}

export interface ListeningBook {
    book: string;
    skill: string;
    tests: ListeningTest[];
}

// ── Reading ──────────────────────────────────────────────────────────────────
export interface ReadingPassage {
    passage_number: number;
    title: string;
    subtitle?: string;
    questions_range?: string;
    time_suggested?: string;
    /** Passage text — stored as a raw string in DB (split by double newlines into paragraphs) */
    text?: string | string[];
    passage_text?: string | string[];
    sub_sections: SubSection[];
}

export interface ReadingTest {
    test_number?: number;
    test_name: string;
    section: string;
    passages: ReadingPassage[];
}

export interface ReadingBook {
    book: string;
    skill: string;
    tests: ReadingTest[];
}

// ── Common component props ───────────────────────────────────────────────────
export interface QuestionComponentProps {
    subSection: SubSection;
    answers: AnswerMap;
    onAnswer: (questionNumber: number | string, value: string) => void;
}
