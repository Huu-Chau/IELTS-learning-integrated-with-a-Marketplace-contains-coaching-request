/**
 * NoteCompletion.tsx
 *
 * Renders structured notes with inline input blanks for each question.
 * Supports notes with [N] placeholders (e.g., "Pollution from [31] on the river bank").
 * Shared by Listening and Reading.
 */
import type { QuestionComponentProps, AnswerMap } from '@/types/questionTypes';

/**
 * Parses a note string like "Some text [31] more text" or "Some text [Q7] more text" and renders
 * the bracketed numbers as inline inputs.
 * Supports both [N] (listening) and [QN] (reading) placeholder formats.
 */
function renderNoteText(
    text: string,
    answers: AnswerMap,
    onAnswer: (qn: number, val: string) => void
) {
    // Match patterns like [31], [Q31], or "31 ________"
    const parts = text.split(/(\[Q?\d+\]|\b\d+\s*_+)/g);
    
    return parts.map((part, i) => {
        const matchBracket = part.match(/^\[Q?(\d+)\]$/);
        const matchUnderscore = part.match(/^(\d+)\s*_+$/);
        const qnMatch = matchBracket || matchUnderscore;

        if (qnMatch) {
            const qn = parseInt(qnMatch[1], 10);
            const val = answers[String(qn)] ?? '';
            return (
                <span key={i} className="inline-flex items-center gap-0.5 mx-0.5">
                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded bg-gray-900 text-white text-[9px] font-bold">
                        {qn}
                    </span>
                    <input
                        type="text"
                        value={val}
                        placeholder="___"
                        onChange={(e) => onAnswer(qn, e.target.value)}
                        className="inline-block min-w-[80px] border-b-2 border-gray-300 focus:border-gray-900 bg-transparent outline-none text-sm font-semibold text-gray-800 px-1 py-0.5 text-center transition-colors"
                    />
                </span>
            );
        }
        return <span key={i}>{part}</span>;
    });
}

export default function NoteCompletion({ subSection, answers, onAnswer }: QuestionComponentProps) {
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