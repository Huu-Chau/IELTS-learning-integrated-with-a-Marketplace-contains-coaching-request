/**
 * MatchingStatementsToPeople.tsx
 *
 * Renders IELTS "Match each statement to the correct person/researcher/expert".
 *
 * A shared box shows the named options (A, B, C…).
 * Each statement gets its own dropdown to pick a letter.
 * The same letter may be used more than once.
 *
 * JSON shape expected:
 *   subSection.options  = { "A": "Martin Rees", "B": "Daniel Wolpert", "C": "Kathleen Richardson" }
 *   subSection.questions = [{ question_number: 27, question_text: "For our own safety…", answer_type: "matching_statements_to_people" }, …]
 */

import type { SubSection, AnswerMap } from '@/types/questionTypes';

interface Props {
    subSection: SubSection;
    answers: AnswerMap;
    onAnswer: (questionNumber: number | string, value: string) => void;
}

export default function MatchingStatementsToPeople({ subSection, answers, onAnswer }: Props) {
    console.log('[MatchingStatementsToPeople] render', { range: subSection.questions_range });

    const options = subSection.options as Record<string, string> | undefined ?? {};
    const optionKeys = Object.keys(options);

    return (
        <div className="space-y-1">
            {/* Named options box */}
            <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Experts</p>
                <div className="flex flex-wrap gap-3">
                    {optionKeys.map(key => (
                        <div key={key} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                            <span className="w-5 h-5 rounded-md bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                {key}
                            </span>
                            <span className="text-sm text-gray-700 font-medium">{options[key]}</span>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 italic">NB You may use any letter more than once.</p>
            </div>

            {/* Statements with dropdowns */}
            <div className="space-y-2">
                {(subSection.questions ?? []).map(q => {
                    const qNum = String(q.question_number);
                    const selected = answers[qNum] ?? '';

                    return (
                        <div
                            key={qNum}
                            className="flex items-start gap-3 py-2.5 px-3 rounded-xl bg-gray-50 border border-gray-100"
                        >
                            <span className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-gray-900 text-white text-[11px] font-bold flex items-center justify-center">
                                {qNum}
                            </span>

                            <p className="flex-1 text-sm text-gray-700 leading-relaxed pt-0.5">
                                {q.question_text}
                            </p>

                            <select
                                id={`q-${qNum}`}
                                value={selected}
                                onChange={e => {
                                    console.log('[MatchingStatementsToPeople] onAnswer', { qNum, value: e.target.value });
                                    onAnswer(qNum, e.target.value);
                                }}
                                className={`shrink-0 text-sm rounded-lg border px-2 py-1.5 outline-none transition-colors cursor-pointer mt-0.5
                                    ${selected
                                        ? 'bg-violet-50 border-violet-300 text-violet-700 font-semibold'
                                        : 'bg-white border-gray-200 text-gray-500'
                                    }`}
                            >
                                <option value="">--</option>
                                {optionKeys.map(key => (
                                    <option key={key} value={key}>
                                        {key} – {options[key]}
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
