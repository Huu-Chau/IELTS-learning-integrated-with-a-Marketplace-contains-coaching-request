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

    const content = subSection.content as Record<string, unknown> | undefined;
    if (!content?.table) {
        // Try to parse the reading-style "Row / Col: Content" format
        const rowSet = new Set<string>();
        const colSet = new Set<string>();
        const cellData: Record<string, Record<string, { qn: number | string, text: string }[]>> = {};

        let isDynamicTable = false;

        subSection.questions.forEach(q => {
            const text = q.question_text || '';
            const match = text.match(/^([^/]+?)\s*\/\s*([^:]+?):\s*(.*)$/);
            if (match) {
                isDynamicTable = true;
                const row = match[1].trim();
                const col = match[2].trim();
                const contentText = match[3].trim();

                rowSet.add(row);
                colSet.add(col);

                if (!cellData[row]) cellData[row] = {};
                if (!cellData[row][col]) cellData[row][col] = [];
                cellData[row][col].push({ qn: q.question_number, text: contentText });
            }
        });

        if (isDynamicTable) {
            const rows = Array.from(rowSet);
            const cols = Array.from(colSet);
            const tableTitle = content?.title ? String(content.title) : '';

            return (
                <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                        <thead>
                            {tableTitle && (
                                <tr className="bg-gray-50">
                                    <th colSpan={cols.length + 1} className="p-3 border-b border-gray-200 text-center">
                                        <span className="text-sm font-bold text-gray-800">{tableTitle}</span>
                                    </th>
                                </tr>
                            )}
                            <tr className="bg-white">
                                <th className="px-4 py-3 text-left font-semibold text-gray-800 border-b border-r border-gray-200 w-1/4">
                                    {/* Empty top-left cell */}
                                </th>
                                {cols.map((col, i) => (
                                    <th key={i} className="px-4 py-3 text-left font-semibold text-gray-800 border-b border-r border-gray-200 last:border-r-0">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, ri) => (
                                <tr key={ri} className="border-b border-gray-200 last:border-b-0 bg-white hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-4 font-bold text-gray-800 border-r border-gray-200 w-1/4 align-top">
                                        {row}
                                    </td>
                                    {cols.map((col, ci) => {
                                        const questionsInCell = cellData[row]?.[col] || [];
                                        
                                        // We assume the first question's text contains all the bullets for the cell
                                        const bullets = questionsInCell.length > 0 
                                            ? questionsInCell[0].text.split(/\s*\/\s*/)
                                            : [];

                                        let qIndex = 0;

                                        return (
                                            <td key={ci} className="px-4 py-4 text-gray-700 align-top border-r border-gray-200 last:border-r-0">
                                                {bullets.length > 0 ? (
                                                    <ul className="list-disc pl-4 space-y-3">
                                                        {bullets.map((bullet, bi) => {
                                                            const parts = bullet.split(/(_{2,}|\.{3,})/g);
                                                            return (
                                                                <li key={bi} className="leading-[1.8] text-[13px] text-gray-600">
                                                                    {parts.map((part, pIndex) => {
                                                                        if (part.match(/_{2,}|\.{3,}/)) {
                                                                            const q = questionsInCell[qIndex] || questionsInCell[questionsInCell.length - 1];
                                                                            if (q) qIndex++;
                                                                            const qn = q?.qn;
                                                                            const val = qn ? answers[String(qn)] ?? '' : '';

                                                                            return (
                                                                                <span key={pIndex} className="inline-flex items-center gap-1.5 mx-1">
                                                                                    {qn && (
                                                                                        <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded bg-[#e6f4ea] text-[#1e8e3e] text-xs font-bold shadow-sm">
                                                                                            {qn}
                                                                                        </span>
                                                                                    )}
                                                                                    <input
                                                                                        type="text"
                                                                                        value={val}
                                                                                        placeholder="___"
                                                                                        onChange={(e) => qn && onAnswer(qn, e.target.value)}
                                                                                        className="inline-block min-w-[80px] max-w-[140px] border-b-2 border-gray-300 focus:border-[#1e8e3e] bg-transparent outline-none text-sm font-semibold text-[#1e8e3e] px-1 py-0.5 text-center transition-colors"
                                                                                    />
                                                                                </span>
                                                                            );
                                                                        }
                                                                        return <span key={pIndex}>{part}</span>;
                                                                    })}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                ) : null}
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

        // Fallback: just show inputs for each question
        return (
            <div className="space-y-4">
                {subSection.questions.map(q => (
                    <div key={q.question_number} className="flex items-center gap-3 text-sm">
                        <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] rounded-full bg-gray-100 text-gray-500 text-xs font-bold shrink-0">
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