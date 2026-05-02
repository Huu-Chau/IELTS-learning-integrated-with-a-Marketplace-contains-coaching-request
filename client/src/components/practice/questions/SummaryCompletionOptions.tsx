/**
 * SummaryCompletionOptions.tsx
 *
 * Summary paragraph with inline <select> dropdowns choosing from a list of options (A–J).
 * Handles: summary_completion_options
 */
import type { QuestionComponentProps } from '@/types/questionTypes';

export default function SummaryCompletionOptions({ subSection, answers, onAnswer }: QuestionComponentProps) {
    const content = subSection.content as Record<string, unknown> | undefined;
    const title = (content?.title as string) ?? '';
    const summary = (content?.summary as string) ?? '';
    const opts = subSection.options ?? {};
    const qMap = new Map(subSection.questions.map(q => [q.question_number, q]));

    // Replace ________ or "N ________" with select dropdowns
    const renderText = () => {
        const parts = summary.split(/((?:\d+\s+)?_{2,})/g);
        let qIdx = 0;

        return parts.map((part, i) => {
            if (part.match(/_{2,}/)) {
                const numMatch = part.match(/^(\d+)\s+_/);
                let qn: number | string;
                if (numMatch) {
                    qn = parseInt(numMatch[1], 10);
                } else {
                    const qnums = Array.from(qMap.keys());
                    qn = qnums[qIdx] ?? qIdx + 1;
                    qIdx++;
                }
                const val = answers[String(qn)] ?? '';
                return (
                    <span key={i} className="inline-flex items-center gap-0.5 mx-0.5">
                        <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded bg-gray-900 text-white text-[9px] font-bold">
                            {qn}
                        </span>
                        <select
                            value={val}
                            onChange={(e) => onAnswer(qn, e.target.value)}
                            className={`border-b-2 bg-transparent outline-none text-sm font-bold cursor-pointer px-1 py-0.5 transition-colors
                ${val ? 'border-gray-900 text-gray-900' : 'border-gray-300 text-gray-400'}`}
                        >
                            <option value="">—</option>
                            {Object.entries(opts).map(([k, v]) => (
                                <option key={k} value={k}>{k} – {v}</option>
                            ))}
                        </select>
                    </span>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            {title && (
                <h4 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b border-dashed border-gray-300">
                    {title}
                </h4>
            )}

            {/* Options reference */}
            <div className="grid grid-cols-2 gap-1 mb-3">
                {Object.entries(opts).map(([k, v]) => (
                    <div key={k} className="text-xs text-gray-600">
                        <span className="font-bold text-gray-500 mr-1">{k}</span>{v}
                    </div>
                ))}
            </div>

            <div className="text-sm text-gray-700 leading-[1.9] whitespace-pre-line">
                {renderText()}
            </div>
        </div>
    );
}