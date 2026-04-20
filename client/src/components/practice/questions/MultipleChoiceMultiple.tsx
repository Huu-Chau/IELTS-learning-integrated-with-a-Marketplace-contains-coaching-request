/**
 * MultipleChoiceMultiple.tsx
 *
 * Checkbox-based component for "Choose TWO/THREE letters" questions.
 * The question_text and options live at the sub_section level,
 * individual questions just carry question_number + answer.
 */
import { useState, useEffect } from 'react';
import type { QuestionComponentProps } from '@/types/questionTypes';

export default function MultipleChoiceMultiple({ subSection, answers, onAnswer }: QuestionComponentProps) {
    console.log('[MultipleChoiceMultiple] render called', { qCount: subSection.questions.length });

    const opts = subSection.options ?? {};
    const stem = subSection.question_text ?? subSection.question_stem ?? '';
    const questionNumbers = subSection.questions.map(q => q.question_number);

    // Track which option letters are currently selected
    const [selected, setSelected] = useState<string[]>([]);

    useEffect(() => {
        const initial: string[] = [];
        questionNumbers.forEach(qn => {
            const val = answers[String(qn)];
            if (val && !initial.includes(val)) initial.push(val);
        });
        setSelected(initial);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleOption = (optKey: string) => {
        console.log('[MultipleChoiceMultiple] toggleOption', { optKey });
        let next: string[];
        if (selected.includes(optKey)) {
            next = selected.filter(s => s !== optKey);
        } else {
            if (selected.length >= questionNumbers.length) {
                next = [...selected.slice(1), optKey]; // replace oldest
            } else {
                next = [...selected, optKey];
            }
        }
        setSelected(next);
        // Map selected letters to question numbers
        next.forEach((val, idx) => {
            if (idx < questionNumbers.length) {
                onAnswer(questionNumbers[idx], val);
            }
        });
        // Clear any excess question slots
        for (let i = next.length; i < questionNumbers.length; i++) {
            onAnswer(questionNumbers[i], '');
        }
    };

    return (
        <div>
            {stem && (
                <p className="text-sm font-medium text-gray-800 mb-3 leading-relaxed flex gap-2">
                    <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-md bg-gray-100 text-gray-500 text-xs font-bold shrink-0 mt-0.5">
                        {questionNumbers.join('-')}
                    </span>
                    <span>{stem}</span>
                </p>
            )}
            <div className="flex flex-col gap-1.5 pl-7">
                {Object.entries(opts).map(([optKey, optVal]) => {
                    const isChecked = selected.includes(optKey);
                    return (
                        <label
                            key={optKey}
                            onClick={() => toggleOption(optKey)}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all text-sm
                ${isChecked
                                    ? 'border-gray-900 bg-gray-50'
                                    : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50/50'
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleOption(optKey)}
                                className="w-4 h-4 mt-0.5 accent-gray-900 shrink-0"
                            />
                            <span className="font-bold text-gray-500 min-w-[14px]">{optKey}</span>
                            <span className="text-gray-700">{optVal}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
