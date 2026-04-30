/**
 * MatchingHeadings.tsx
 *
 * Renders the IELTS "Matching Headings" question type.
 *
 * For each question (e.g. "Section A", "Section B"…), the student picks one
 * heading from a shared list of options (i, ii, iii…) via a styled dropdown.
 * The answer brackets appear here in the question panel — NOT in the passage.
 *
 * JSON shape expected:
 *   subSection.options  = { "i": "Tried and tested…", "ii": "Cooperation beneath…", … }
 *   subSection.questions = [{ question_number: 14, question_text: "Section A", answer_type: "matching_headings" }, …]
 */

import type { SubSection, AnswerMap } from '@/types/questionTypes';

interface Props {
    subSection: SubSection;
    answers: AnswerMap;
    onAnswer: (questionNumber: number | string, value: string) => void;
}

export default function MatchingHeadings({ subSection, answers, onAnswer }: Props) {
    console.log('[MatchingHeadings] render', { range: subSection.questions_range });

    const options = subSection.options as Record<string, string> | undefined ?? {};
    const optionKeys = Object.keys(options);

    return (
        <div className="space-y-1">
            {/* Shared list of headings — shown once at top */}
            <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">List of Headings</p>
                <div className="space-y-1">
                    {optionKeys.map(key => (
                        <div key={key} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="shrink-0 font-semibold text-gray-500 w-6 text-right">{key}</span>
                            <span className="leading-snug">{options[key]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Per-section dropdown */}
            <div className="space-y-2.5">
                {(subSection.questions ?? []).map(q => {
                    const qNum = String(q.question_number);
                    const selected = answers[qNum] ?? '';

                    return (
                        <div
                            key={qNum}
                            className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50 border border-gray-100"
                        >
                            {/* Question number badge */}
                            <span className="shrink-0 w-7 h-7 rounded-lg bg-gray-900 text-white text-[11px] font-bold flex items-center justify-center">
                                {qNum}
                            </span>

                            {/* Section label */}
                            <span className="flex-1 text-sm text-gray-700 font-medium">
                                {q.question_text}
                            </span>

                            {/* Heading picker */}
                            <select
                                id={`q-${qNum}`}
                                value={selected}
                                onChange={e => {
                                    console.log('[MatchingHeadings] onAnswer', { qNum, value: e.target.value });
                                    onAnswer(qNum, e.target.value);
                                }}
                                className={`shrink-0 text-sm rounded-lg border px-2 py-1.5 outline-none transition-colors cursor-pointer
                                    ${selected
                                        ? 'bg-violet-50 border-violet-300 text-violet-700 font-semibold'
                                        : 'bg-white border-gray-200 text-gray-500'
                                    }`}
                            >
                                <option value="">-- pick --</option>
                                {optionKeys.map(key => (
                                    <option key={key} value={key}>
                                        {key}. {options[key]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
