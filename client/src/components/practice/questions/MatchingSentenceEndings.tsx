/**
 * MatchingSentenceEndings.tsx
 *
 * Lists sentence beginnings with ending options (A–G) shown as chips,
 * each sentence has a dropdown to select the correct ending.
 */
import type { QuestionComponentProps } from '@/types/questionTypes';

export default function MatchingSentenceEndings({ subSection, answers, onAnswer }: QuestionComponentProps) {
    const opts = subSection.options ?? {};

    return (
        <div>
            {/* Ending options list */}
            <div className="space-y-1 mb-4">
                {Object.entries(opts).map(([k, v]) => (
                    <div key={k} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 flex gap-2">
                        <span className="font-bold text-gray-500 min-w-[14px]">{k}</span>
                        <span>{v}</span>
                    </div>
                ))}
            </div>

            {/* Sentence beginnings + dropdowns */}
            <div className="space-y-0">
                {subSection.questions.map(q => {
                    const key = String(q.question_number);
                    const selected = answers[key] ?? '';
                    return (
                        <div
                            key={q.question_number}
                            className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0"
                        >
                            <div className="flex-1 flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-md bg-gray-100 text-gray-500 text-xs font-bold shrink-0 mt-0.5">
                                    {q.question_number}
                                </span>
                                <span>{q.question_text}</span>
                            </div>
                            <select
                                value={selected}
                                onChange={(e) => onAnswer(q.question_number, e.target.value)}
                                className={`min-w-[60px] border rounded-lg px-2 py-1 text-xs font-semibold outline-none cursor-pointer transition-colors
                  ${selected
                                        ? 'border-gray-900 bg-gray-50 text-gray-900'
                                        : 'border-gray-200 bg-white text-gray-400'
                                    }`}
                            >
                                <option value="">—</option>
                                {Object.keys(opts).map(k => (
                                    <option key={k} value={k}>{k}</option>
                                ))}
                            </select>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}