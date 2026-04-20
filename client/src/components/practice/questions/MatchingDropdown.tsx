/**
 * MatchingDropdown.tsx
 *
 * Dropdown-based matching component. Shows option chips above, then
 * a list of question statements each with a <select> dropdown.
 *
 * Handles: matching, matching_information, matching_features, matching_paragraph
 */
import type { QuestionComponentProps } from '@/types/questionTypes';

export default function MatchingDropdown({ subSection, answers, onAnswer }: QuestionComponentProps) {
    console.log('[MatchingDropdown] render called', { qCount: subSection.questions.length });

    const opts = subSection.options ?? {};
    const stem = subSection.question_text ?? subSection.question_stem ?? '';

    return (
        <div>
            {/* Shared stem */}
            {stem && (
                <p className="text-sm text-gray-700 font-medium mb-3 leading-relaxed">{stem}</p>
            )}

            {/* Options chip grid */}
            <div className="grid grid-cols-2 gap-1.5 mb-4">
                {Object.entries(opts).map(([k, v]) => (
                    <div key={k} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700">
                        <span className="font-bold text-gray-500 mr-1.5">{k}</span>{v}
                    </div>
                ))}
            </div>

            {/* Question rows */}
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
