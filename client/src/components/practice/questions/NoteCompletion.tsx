/**
 * NoteCompletion.tsx
 *
 * Renders structured notes with inline input blanks for each question.
 * Supports notes with [N] placeholders (e.g., "Pollution from [31] on the river bank").
 * Shared by Listening and Reading.
 */
import type { QuestionComponentProps, AnswerMap } from '@/types/questionTypes';


/**
 * Parses a note string and renders inline inputs for blanks.
 *
 * Supports two formats:
 *  1. Bracket:   "Some text [31] more text"  (used by Listening JSON)
 *  2. Underline: "Some text 2 ________"      (used by Reading JSON)
 *     — the number immediately before the underscores is the question number.
 */
function renderNoteText(
    text: string,
    answers: AnswerMap,
    onAnswer: (qn: number, val: string) => void
) {
    // Combined regex: matches [N], [QN], or  N ___ (number followed by 2+ underscores)
    const TOKEN = /(\[Q?\d+\]|\d+\s*_{2,})/g;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];


    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = TOKEN.exec(text)) !== null) {
        // Push literal text before this match
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        const raw = match[0];

        // Determine question number
        let qn: number;
        if (raw.startsWith('[')) {
            // Format: [31] or [Q31]
            qn = parseInt(raw.match(/\d+/)![0], 10);
        } else {
            // Format: "2 ________" — number is the first token
            qn = parseInt(raw.match(/\d+/)![0], 10);
        }

        const val = answers[String(qn)] ?? '';
        parts.push(
            <span key={`${qn}-${match.index}`} className="inline-flex items-center gap-0.5 mx-0.5">
                <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded bg-gray-900 text-white text-[9px] font-bold shrink-0">
                    {qn}
                </span>
                <input
                    id={`q-${qn}`}
                    type="text"
                    value={val}
                    placeholder="___"
                    onChange={(e) => onAnswer(qn, e.target.value)}
                    className="inline-block min-w-[80px] border-b-2 border-gray-300 focus:border-violet-500 bg-transparent outline-none text-sm font-semibold text-gray-800 px-1 py-0.5 text-center transition-colors"
                />
            </span>
        );

        lastIndex = match.index + raw.length;
    }

    // Push any remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts;
}


export default function NoteCompletion({ subSection, answers, onAnswer }: QuestionComponentProps) {
    console.log('[NoteCompletion] render called', { qCount: subSection.questions.length });

    const content = subSection.content as Record<string, unknown> | undefined;
    const title = (content?.title as string) ?? '';
    const sections = (content?.sections as Array<{
        heading: string;
        notes: string[];
    }>) ?? [];

    // Fallback: if content has notes at top level (some JSON variants)
    const topNotes = (content?.notes as string[]) ?? [];

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            {title && (
                <h4 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b border-dashed border-gray-300">
                    {title}
                </h4>
            )}

            {/* Structured sections */}
            {sections.map((sec, idx) => (
                <div key={idx} className="mb-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        {sec.heading}
                    </p>
                    <ul className="space-y-0.5">
                        {sec.notes.map((note, ni) => {
                            const isIndented = note.startsWith('–') || note.startsWith('-');
                            return (
                                <li
                                    key={ni}
                                    className={`text-sm text-gray-700 leading-[1.8] ${isIndented ? 'pl-5' : 'pl-2'}`}
                                >
                                    {isIndented && <span className="text-gray-400 mr-1">–</span>}
                                    {renderNoteText(isIndented ? note.slice(1).trim() : note, answers, onAnswer)}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}

            {/* Top-level notes fallback */}
            {topNotes.length > 0 && sections.length === 0 && (
                <ul className="space-y-0.5">
                    {topNotes.map((note, ni) => (
                        <li key={ni} className="text-sm text-gray-700 leading-[1.8] pl-2">
                            {renderNoteText(note, answers, onAnswer)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
