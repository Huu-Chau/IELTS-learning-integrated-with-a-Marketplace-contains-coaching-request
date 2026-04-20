/**
 * TrueFalseNotGiven.tsx
 *
 * Renders TRUE / FALSE / NOT GIVEN toggle buttons (or YES / NO / NOT GIVEN
 * when variant='ynng') for each question in the sub-section.
 */
import type { QuestionComponentProps } from '@/types/questionTypes';

interface TFNGProps extends QuestionComponentProps {
    variant?: 'tfng' | 'ynng';
}

export default function TrueFalseNotGiven({ subSection, answers, onAnswer, variant = 'tfng' }: TFNGProps) {
    console.log('[TrueFalseNotGiven] render called', { variant, qCount: subSection.questions.length });

    const labels = variant === 'ynng' ? ['YES', 'NO', 'NOT GIVEN'] : ['TRUE', 'FALSE', 'NOT GIVEN'];

    return (
        <div className="space-y-3">
            {subSection.questions.map(q => {
                const key = String(q.question_number);
                const selected = answers[key] ?? '';
                return (
                    <div
                        key={q.question_number}
                        className="p-3 border border-gray-200 rounded-xl hover:border-gray-400 transition-colors"
                    >
                        <div className="flex gap-2 text-sm text-gray-700 mb-2.5 leading-relaxed">
                            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-md bg-gray-100 text-gray-500 text-xs font-bold shrink-0 mt-0.5">
                                {q.question_number}
                            </span>
                            <span>{q.question_text}</span>
                        </div>
                        <div className="flex gap-2 pl-7">
                            {labels.map(label => (
                                <button
                                    key={label}
                                    onClick={() => onAnswer(q.question_number, label)}
                                    className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer
                    ${selected === label
                                            ? 'border-gray-900 bg-gray-900 text-white'
                                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
