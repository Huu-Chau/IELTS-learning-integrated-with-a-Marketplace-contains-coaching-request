/**
 * TableCompletion.tsx
 *
 * Renders a table with inline input blanks for numbered placeholders [1], [2], etc.
 * Used primarily by Listening Part 1 (restaurant recommendations, etc.).
 */
import React from 'react';
import type { QuestionComponentProps, AnswerMap } from '@/types/questionTypes';

/**
 * Render cell text, replacing [N] with inline inputs.
 */
function renderCellContent(
    value: string | string[] | undefined,
    answers: AnswerMap,
    onAnswer: (qn: number, val: string) => void
): React.ReactNode {
    if (!value) return null;

    const texts = Array.isArray(value) ? value : [value];

    return texts.map((text, idx) => {
        const parts = String(text).split(/(\[\d+\])/g);
        return (
            <div key={idx} className={idx > 0 ? 'mt-1' : ''}>
                {parts.map((part, i) => {
                    const match = part.match(/^\[(\d+)\]$/);
                    if (match) {
                        const qn = parseInt(match[1], 10);
                        const val = answers[String(qn)] ?? '';
                        return (
                            <span key={i} className="inline-flex items-center gap-0.5 mx-0.5">
                                <span className="inline-flex items-center justify-center w-[16px] h-[16px] rounded bg-gray-900 text-white text-[8px] font-bold">
                                    {qn}
                                </span>
                                <input
                                    type="text"
                                    value={val}
                                    placeholder="___"
                                    onChange={(e) => onAnswer(qn, e.target.value)}
                                    className="inline-block w-20 border-b-2 border-gray-300 focus:border-gray-900 bg-transparent outline-none text-xs font-semibold text-gray-800 px-1 py-0.5 text-center transition-colors"
                                />
                            </span>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </div>
        );
    });
}

export default function TableCompletion({ subSection, answers, onAnswer }: QuestionComponentProps) {
    console.log('[TableCompletion] render called', { qCount: subSection.questions.length });

    const content = subSection.content as Record<string, unknown> | undefined;
    if (!content?.table) {
        // Fallback: just show inputs for each question
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

    const table = content.table as {
        columns: string[];
        rows: Array<Record<string, string | string[]>>;
    };
    const tableTitle = content.title ? String(content.title) : '';

    return (
        <div className="overflow-x-auto">
            {tableTitle && (
                <h4 className="text-sm font-bold text-gray-800 mb-3">{tableTitle}</h4>
            )}
            <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                    <tr className="bg-gray-100">
                        {table.columns.map((col, i) => (
                            <th key={i} className="px-3 py-2 text-left font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {table.rows.map((row, ri) => (
                        <tr key={ri} className="border-b border-gray-100 last:border-b-0">
                            {table.columns.map((col, ci) => {
                                // Match the column title to the object key defensively
                                let cellKey = col.toLowerCase().replace(/ /g, '_');
                                
                                // If the exact cellKey doesn't exist, search for a partial match
                                if (!(cellKey in row)) {
                                    const rowKeys = Object.keys(row);
                                    const foundKey = rowKeys.find(k => cellKey.includes(k) || k.includes(cellKey));
                                    
                                    if (foundKey) {
                                        cellKey = foundKey;
                                    } else {
                                        // Fallback to strict index mapping if names completely mismatch
                                        cellKey = rowKeys[ci];
                                    }
                                }

                                const cellVal = row[cellKey];

                                return (
                                    <td key={ci} className="px-3 py-2 text-gray-700 align-top border-r border-gray-100 last:border-r-0">
                                        {renderCellContent(cellVal as string | string[], answers, onAnswer)}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
