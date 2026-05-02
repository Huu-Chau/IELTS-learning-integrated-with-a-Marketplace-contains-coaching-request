import type { QuestionComponentProps } from '@/types/questionTypes';

export default function MatchingDropdown({ subSection, answers, onAnswer }: QuestionComponentProps) {
    const opts = subSection.options ?? {};
    const optionKeys = Object.keys(opts);

    return (
        <div>
            {/* Options List / Legend (Optional but good for reference) */}
            {optionKeys.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-6 bg-white p-3 border border-gray-100 rounded-lg shadow-sm">
                    {Object.entries(opts).map(([k, v]) => (
                        <div key={k} className="text-sm text-gray-700">
                            <span className="font-bold text-gray-500 mr-2">{k}</span>
                            {v as string}
                        </div>
                    ))}
                </div>
            )}

            {/* Questions with inline dropdowns */}
            <div className="space-y-4">
                {subSection.questions.map(q => {
                    const key = String(q.question_number);
                    const selectedValue = answers[key] ?? '';
                    const isHeadings = subSection.question_type === 'matching_headings' || 
                                       subSection.question_type === 'heading_matching' ||
                                       q.answer_type === 'matching_headings' ||
                                       q.answer_type === 'heading_matching';

                    return (
                        <div
                            key={q.question_number}
                            className={`flex ${isHeadings ? 'items-center justify-between border-b border-gray-100 pb-4 last:border-0' : 'flex-col md:flex-row md:items-start'} gap-4`}
                        >
                            <div className={`flex items-center gap-3 ${isHeadings ? '' : 'w-full md:w-auto shrink-0'}`}>
                                <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] rounded-full bg-[#e6f4ea] text-[#1e8e3e] text-xs font-bold shrink-0">
                                    {q.question_number}
                                </span>
                                
                                {isHeadings && (
                                    <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                                        {q.question_text}
                                    </span>
                                )}
                                
                                {!isHeadings && (
                                    <div className="relative w-full md:w-[180px]">
                                        <select
                                            value={selectedValue}
                                            onChange={(e) => onAnswer(q.question_number, e.target.value)}
                                            className={`w-full appearance-none rounded-lg px-3 py-2 text-sm outline-none cursor-pointer border transition-colors
                                                ${selectedValue 
                                                    ? 'border-[#e6f4ea] bg-[#e6f4ea] text-[#1e8e3e] font-semibold' 
                                                    : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                                                }`}
                                        >
                                            <option value="" disabled hidden>
                                                Select option
                                            </option>
                                            {Object.entries(opts).map(([k, v]) => (
                                                <option key={k} value={k}>
                                                    {k}: {v as string}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {isHeadings && (
                                <div className="relative w-full md:w-[250px] shrink-0">
                                    <select
                                        value={selectedValue}
                                        onChange={(e) => onAnswer(q.question_number, e.target.value)}
                                        className={`w-full appearance-none rounded-lg px-3 py-2 text-sm outline-none cursor-pointer border transition-colors
                                            ${selectedValue 
                                                ? 'border-[#e6f4ea] bg-[#e6f4ea] text-[#1e8e3e] font-semibold' 
                                                : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                                            }`}
                                    >
                                        <option value="" disabled hidden>
                                            Select heading
                                        </option>
                                        {Object.entries(opts).map(([k, v]) => (
                                            <option key={k} value={k}>
                                                {k}: {v as string}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                        </svg>
                                    </div>
                                </div>
                            )}

                            {!isHeadings && (
                                <div className="text-sm text-gray-700 leading-relaxed pt-2 md:pt-1">
                                    {q.question_text}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
