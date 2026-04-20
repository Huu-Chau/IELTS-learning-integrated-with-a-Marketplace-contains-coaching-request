/**
 * SummaryCompletion.tsx
 *
 * Paragraph with inline text inputs replacing ________ blanks.
 * Handles: summary_completion, sentence_completion
 */
import type { QuestionComponentProps } from '@/types/questionTypes';

export default function SummaryCompletion({ subSection, answers, onAnswer }: QuestionComponentProps) {
    console.log('[SummaryCompletion] render called', { qCount: subSection.questions.length });

    const content = subSection.content as Record<string, unknown> | undefined;
    const title = (content?.title as string) ?? '';
    const summary = (content?.summary as string) ?? '';
    const sentences = (content?.sentences as string[]) ?? [];

    // Build the text to render — either a summary paragraph or individual sentences
    const textToRender = summary || sentences.join('\n');

    if (!textToRender) {
        // Fallback: just render questions with inline inputs
        return (
            <div className="space-y-2">
                {subSection.questions.map(q => (
                    <div key={q.question_number} className="flex items-center gap-2 text-sm">
                        <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-md bg-gray-100 text-gray-500 text-xs font-bold shrink-0">
                            {q.question_number}
                        </span>
                        <span className="text-gray-700 flex-1">{q.question_text}</span>
                        <input
                            type="text"
                            value={answers[String(q.question_number)] ?? ''}
                            placeholder="___"
                            onChange={(e) => onAnswer(q.question_number, e.target.value)}
                            className="w-28 border-b-2 border-gray-300 focus:border-gray-900 bg-transparent outline-none text-sm font-semibold text-gray-800 px-1 py-0.5 text-center transition-colors"
                        />
                    </div>
                ))}
            </div>
        );
    }

    // Build a map of question numbers to track which blanks we've seen
    const qMap = new Map(subSection.questions.map(q => [q.question_number, q]));

    // Replace ________ or numbered blanks like "32 ________" with inputs
    const renderText = () => {
        // Split on patterns: "N ________" or just "________"
        const parts = textToRender.split(/((?:\d+\s+)?_{2,})/g);
        let qIdx = 0;

        return parts.map((part, i) => {
            if (part.match(/_{2,}/)) {
                // Extract question number if prefixed (e.g. "32 ________")
                const numMatch = part.match(/^(\d+)\s+_/);
                let qn: number;
                if (numMatch) {
                    qn = parseInt(numMatch[1], 10);
                } else {
                    // Use the next question number in sequence
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
                        <input
                            type="text"
                            value={val}
                            placeholder="___"
                            onChange={(e) => onAnswer(qn, e.target.value)}
                            className="inline-block min-w-[80px] border-b-2 border-gray-300 focus:border-gray-900 bg-transparent outline-none text-sm font-semibold text-gray-800 px-1 py-0.5 text-center transition-colors"
                        />
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
            <div className="text-sm text-gray-700 leading-[1.9] whitespace-pre-line">
                {renderText()}
            </div>
        </div>
    );
}
