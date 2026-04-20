/**
 * MultipleChoice.tsx
 *
 * Radio-button MCQ component (A / B / C / D).
 * Used by both Listening and Reading.
 */
import type { QuestionComponentProps } from '@/types/questionTypes';

export default function MultipleChoice({ subSection, answers, onAnswer }: QuestionComponentProps) {
    console.log('[MultipleChoice] render called', { qCount: subSection.questions.length });

    return (
        <div className="space-y-5">
            {subSection.questions.map(q => {
                const key = String(q.question_number);
                const selected = answers[key] ?? '';
                const opts = q.options ?? {};
                return (
                    <div key={q.question_number}>
                        <div className="flex gap-2 text-sm font-medium text-gray-800 mb-2.5 leading-relaxed">
                            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-md bg-gray-100 text-gray-500 text-xs font-bold shrink-0 mt-0.5">
                                {q.question_number}
                            </span>
                            <span>{q.question_text}</span>
                        </div>
                        <div className="flex flex-col gap-1.5 pl-7">
                            {Object.entries(opts).map(([optKey, optVal]) => (
                                <label
                                    key={optKey}
                                    onClick={() => onAnswer(q.question_number, optKey)}
                                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all text-sm
                    ${selected === optKey
                                            ? 'border-gray-900 bg-gray-50'
                                            : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50/50'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name={`mcq-${q.question_number}`}
                                        value={optKey}
                                        checked={selected === optKey}
                                        onChange={() => onAnswer(q.question_number, optKey)}
                                        className="w-4 h-4 mt-0.5 accent-gray-900 shrink-0"
                                    />
                                    <span className="font-bold text-gray-500 min-w-[14px]">{optKey}</span>
                                    <span className="text-gray-700">{optVal}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
