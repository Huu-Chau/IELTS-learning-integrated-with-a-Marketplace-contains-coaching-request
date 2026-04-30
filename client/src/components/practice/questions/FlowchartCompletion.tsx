/**
 * FlowchartCompletion.tsx
 *
 * Renders IELTS Listening "Flowchart / Form Completion" question type.
 * Identical UX to NoteCompletion — numbered blank inputs per question.
 * This component is a thin alias wrapper so QuestionSectionCard can route
 * flowchart_completion, form_completion, and map_labelling here.
 *
 * JSON shape expected:
 *   subSection.questions = [{ question_number: 26, question_text: "Type of ________", answer_type: "flowchart_completion" }, …]
 */

import type { SubSection, AnswerMap } from '@/types/questionTypes';

interface Props {
    subSection: SubSection;
    answers: AnswerMap;
    onAnswer: (questionNumber: number | string, value: string) => void;
}

export default function FlowchartCompletion({ subSection, answers, onAnswer }: Props) {
    console.log('[FlowchartCompletion] render', { range: subSection.questions_range });

    const questions = subSection.questions ?? [];

    return (
        <div className="space-y-3">
            {questions.map(q => {
                const qNum = String(q.question_number);
                const value = answers[qNum] ?? '';

                return (
                    <div
                        key={qNum}
                        className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50 border border-gray-100"
                    >
                        {/* Question number badge */}
                        <span className="shrink-0 w-7 h-7 rounded-lg bg-gray-900 text-white text-[11px] font-bold flex items-center justify-center">
                            {qNum}
                        </span>

                        {/* Question text with inline blank */}
                        <p className="flex-1 text-sm text-gray-700 leading-relaxed">
                            {q.question_text}
                        </p>

                        {/* Answer input */}
                        <input
                            id={`q-${qNum}`}
                            type="text"
                            value={value}
                            onChange={e => {
                                console.log('[FlowchartCompletion] onAnswer', { qNum, value: e.target.value });
                                onAnswer(qNum, e.target.value);
                            }}
                            placeholder="Answer…"
                            className={`shrink-0 w-32 text-sm rounded-lg border px-2 py-1.5 outline-none transition-colors
                                ${value
                                    ? 'bg-violet-50 border-violet-300 text-violet-800 font-medium'
                                    : 'bg-white border-gray-200 text-gray-700 focus:border-violet-400'
                                }`}
                        />
                    </div>
                );
            })}
        </div>
    );
}
