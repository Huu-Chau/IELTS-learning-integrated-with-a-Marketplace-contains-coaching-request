/**
 * SentenceCompletionOptions.tsx
 *
 * Renders IELTS "Complete each sentence with the correct ending, A–D below."
 *
 * A shared box shows the possible endings (A, B, C…).
 * Each question shows the sentence beginning, and the student picks an ending
 * via a dropdown.
 *
 * JSON shape expected:
 *   subSection.options  = { "A": "robots to explore outer space.", "B": "…", … }
 *   subSection.questions = [{ question_number: 34, question_text: "Richardson and Rees express similar views regarding…", answer_type: "sentence_completion_options" }, …]
 */

import type { SubSection, AnswerMap } from '@/types/questionTypes';

interface Props {
    subSection: SubSection;
    answers: AnswerMap;
    onAnswer: (questionNumber: number | string, value: string) => void;
}

export default function SentenceCompletionOptions({ subSection, answers, onAnswer }: Props) {
    console.log('[SentenceCompletionOptions] render', { range: subSection.questions_range });

    const options = subSection.options as Record<string, string> | undefined ?? {};
    const optionKeys = Object.keys(options);

    return (
        <div className="space-y-1">
            {/* Endings bank */}
            <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Sentence Endings</p>
                <div className="space-y-1.5">
                    {optionKeys.map(key => (
                        <div key={key} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="shrink-0 w-5 h-5 rounded-md bg-gray-200 text-gray-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                                {key}
                            </span>
                            <span className="leading-snug">{options[key]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Questions */}
            <div className="space-y-3">
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

                            <div className="flex-1 min-w-0">
                                {/* Sentence beginning */}
                                <p className="text-sm text-gray-700 leading-relaxed mb-2">
                                    {q.question_text}
                                    <span className="text-gray-400 italic"> …</span>
                                </p>

                                {/* Selected ending preview */}
                                {selected && (
                                    <p className="text-sm text-violet-700 font-medium leading-relaxed bg-violet-50 px-2 py-1 rounded-lg border border-violet-100">
                                        {selected}. {options[selected]}
                                    </p>
                                )}

                                {/* Dropdown */}
                                <select
                                    id={`q-${qNum}`}
                                    value={selected}
                                    onChange={e => {
                                        console.log('[SentenceCompletionOptions] onAnswer', { qNum, value: e.target.value });
                                        onAnswer(qNum, e.target.value);
                                    }}
                                    className={`mt-2 w-full text-sm rounded-lg border px-2 py-1.5 outline-none transition-colors cursor-pointer
                                        ${selected
                                            ? 'bg-violet-50 border-violet-300 text-violet-700 font-semibold'
                                            : 'bg-white border-gray-200 text-gray-500'
                                        }`}
                                >
                                    <option value="">— select an ending —</option>
                                    {optionKeys.map(key => (
                                        <option key={key} value={key}>
                                            {key}. {options[key]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
