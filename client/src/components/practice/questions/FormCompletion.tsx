/**
 * FormCompletion.tsx
 *
 * Renders structured form fields with inline input blanks for each question.
 * Supports values with [N] placeholders (e.g., "Gary [1]").
 */
import type { QuestionComponentProps, AnswerMap } from '@/types/questionTypes';

/**
 * Parses a string like "Gary [1]" and renders the bracketed numbers as inline inputs.
 */
function renderFormText(
    text: string,
    answers: AnswerMap,
    onAnswer: (qn: number, val: string) => void
) {
    const parts = text.split(/(\[Q?\d+\])/g);
    return parts.map((part, i) => {
        const match = part.match(/^\[Q?(\d+)\]$/);
        if (match) {
            const qn = parseInt(match[1], 10);
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
                        className="inline-block min-w-[100px] border-b-2 border-gray-300 focus:border-gray-900 bg-transparent outline-none text-sm font-semibold text-gray-800 px-1 py-0.5 text-center transition-colors"
                    />
                </span>
            );
        }
        return <span key={i}>{part}</span>;
    });
}

export default function FormCompletion({ subSection, answers, onAnswer }: QuestionComponentProps) {
    const content = subSection.content as Record<string, unknown> | undefined;
    const title = (content?.title as string) ?? '';

    // Handle both Array format (Cam 19) and Object format (Cam 18) for form data
    let formFields: Array<{ field: string; value: string }> = [];
    if (Array.isArray(content?.form)) {
        formFields = content.form as Array<{ field: string; value: string }>;
    } else if (content?.form && typeof content.form === 'object') {
        formFields = Object.entries(content.form).map(([key, val]) => ({
            field: key,
            value: String(val)
        }));
    }

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm">
            {title && (
                <h4 className="text-[13px] font-black text-gray-800 uppercase tracking-wider mb-4 text-center">
                    {title}
                </h4>
            )}

            <div className="space-y-4">
                {formFields.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 border-b border-gray-200 border-dashed pb-3 last:border-0 last:pb-0">
                        {/* Field Label */}
                        <div className="sm:w-1/3 shrink-0 text-sm font-semibold text-gray-600">
                            {item.field}
                        </div>
                        {/* Field Value with inputs */}
                        <div className="flex-1 text-sm text-gray-800 font-medium">
                            {renderFormText(item.value, answers, onAnswer)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
