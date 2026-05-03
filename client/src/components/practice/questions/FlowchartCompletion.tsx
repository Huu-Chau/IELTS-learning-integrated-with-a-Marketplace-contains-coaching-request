/**
 * FlowchartCompletion.tsx
 *
 * Renders a flowchart with sequential boxes connected by arrows.
 * Each [N] placeholder becomes a dropdown select populated with the options.
 * The dropdown displays the option VALUE (e.g., "size", "age") and stores
 * the option KEY (e.g., "A", "C") as the answer.
 */
import type { QuestionComponentProps, AnswerMap } from '@/types/questionTypes';

/**
 * Parses a string like "Choose mice which are all the same [26]" and renders
 * the bracketed numbers as inline dropdown selects.
 */
function renderFlowchartText(
    text: string,
    answers: AnswerMap,
    onAnswer: (qn: number, val: string) => void,
    options: Record<string, string>
) {
    console.log('[FlowchartCompletion] renderFlowchartText called', { text, optionCount: Object.keys(options).length });
    const parts = text.split(/(\[Q?\d+\])/g);
    return parts.map((part, i) => {
        const match = part.match(/^\[Q?(\d+)\]$/);
        if (match) {
            const qn = parseInt(match[1], 10);
            const val = answers[String(qn)] ?? '';
            return (
                <span key={i} className="inline-flex items-center gap-1 mx-1 align-middle">
                    <span className="inline-flex items-center justify-center w-[20px] h-[20px] rounded bg-[#e6f4ea] text-[#1e8e3e] text-[11px] font-bold shrink-0">
                        {qn}
                    </span>
                    <select
                        value={val}
                        onChange={(e) => onAnswer(qn, e.target.value)}
                        className={`min-w-[120px] border rounded-lg px-2 py-1 text-sm font-semibold outline-none cursor-pointer transition-colors
                            ${val
                                ? 'border-gray-900 bg-gray-50 text-gray-900'
                                : 'border-gray-200 bg-white text-gray-400'
                            }`}
                    >
                        <option value="">—</option>
                        {Object.entries(options).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </span>
            );
        }
        return <span key={i}>{part}</span>;
    });
}

export default function FlowchartCompletion({ subSection, answers, onAnswer }: QuestionComponentProps) {
    console.log('[FlowchartCompletion] render called', { questionsRange: subSection.questions_range });
    const content = subSection.content as Record<string, unknown> | undefined;
    const title = (content?.title as string) ?? '';
    const flowchartSteps = (subSection as any).flowchart_steps as string[] ?? [];
    const options = (subSection.options ?? {}) as Record<string, string>;

    return (
        <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100">
            {title && (
                <h4 className="text-sm font-bold text-gray-700 text-center mb-6">
                    {title}
                </h4>
            )}

            {/* Options Bank — show at the top so user knows their choices */}
            {Object.keys(options).length > 0 && (
                <div className="mb-6">
                    <div className="flex flex-wrap justify-center gap-2">
                        {Object.entries(options).map(([key, val]) => (
                            <div key={key} className="bg-white border border-gray-200 rounded px-3 py-1.5 text-xs text-gray-600 shadow-sm flex items-center gap-2">
                                <span className="font-medium text-gray-700">{val}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* The Flowchart Steps */}
            <div className="flex flex-col items-center max-w-2xl mx-auto space-y-3">
                {flowchartSteps.map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center w-full">
                        {/* The Box */}
                        <div className="w-full bg-white border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-700 leading-relaxed shadow-sm">
                            {renderFlowchartText(step, answers, onAnswer, options)}
                        </div>

                        {/* The Down Arrow (except for the last item) */}
                        {idx < flowchartSteps.length - 1 && (
                            <div className="text-gray-400 mt-3 flex items-center justify-center">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <polyline points="19 12 12 19 5 12"></polyline>
                                </svg>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
