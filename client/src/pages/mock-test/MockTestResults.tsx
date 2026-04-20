/**
 * MockTestResults.tsx
 *
 * Full-page grading results for Reading/Listening mock tests.
 * Shows:
 *  - Band score (large, prominent)
 *  - Donut chart with correct / wrong / unanswered
 *  - Per-question review table with your answer vs correct answer
 *
 * Designed to match the IELTS exam result aesthetic.
 */

import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, RotateCcw } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface QuestionResult {
    questionNumber: string;
    correctAnswer: string;
    userAnswer: string;
    isCorrect: boolean;
}

export interface GradeResult {
    correct: number;
    wrong: number;
    unanswered: number;
    total: number;
    bandScore: number;
    results: QuestionResult[];
}

interface MockTestResultsProps {
    skill: 'Reading' | 'Listening';
    setName: string;
    testNumber: number;
    gradeResult: GradeResult;
    timeSpent: number;          // seconds spent on the test
    onBack: () => void;
    onRetake: () => void;
}

// ── Donut SVG ────────────────────────────────────────────────────────────────

function DonutChart({
    correct,
    wrong,
    unanswered,
    total,
}: {
    correct: number;
    wrong: number;
    unanswered: number;
    total: number;
}) {
    console.log('[DonutChart] render', { correct, wrong, unanswered, total });

    const size = 160;
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const correctPct = total > 0 ? correct / total : 0;
    const wrongPct = total > 0 ? wrong / total : 0;
    const unansweredPct = total > 0 ? unanswered / total : 0;

    const correctLen = correctPct * circumference;
    const wrongLen = wrongPct * circumference;
    const unansweredLen = unansweredPct * circumference;

    // Offsets for each segment
    const correctOffset = 0;
    const wrongOffset = correctLen;
    const unansweredOffset = correctLen + wrongLen;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
            {/* Background track */}
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth}
            />
            {/* Correct (green) */}
            {correctLen > 0 && (
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="#22c55e" strokeWidth={strokeWidth}
                    strokeDasharray={`${correctLen} ${circumference - correctLen}`}
                    strokeDashoffset={-correctOffset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                />
            )}
            {/* Wrong (red) */}
            {wrongLen > 0 && (
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="#ef4444" strokeWidth={strokeWidth}
                    strokeDasharray={`${wrongLen} ${circumference - wrongLen}`}
                    strokeDashoffset={-wrongOffset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                />
            )}
            {/* Unanswered (gray) */}
            {unansweredLen > 0 && (
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="#d1d5db" strokeWidth={strokeWidth}
                    strokeDasharray={`${unansweredLen} ${circumference - unansweredLen}`}
                    strokeDashoffset={-unansweredOffset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                />
            )}
        </svg>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getBandMessage(band: number): string {
    if (band >= 8.0) return 'Outstanding! You have a very high command of English.';
    if (band >= 7.0) return 'Great job! You have a good command of English.';
    if (band >= 6.0) return 'Well done! You are a competent English user.';
    if (band >= 5.0) return 'Good effort! Keep practising to improve further.';
    if (band >= 4.0) return 'You\'re making progress. Focus on weaker areas.';
    return 'Keep going! Consistent practice will help you improve.';
}

function getBandColor(band: number): string {
    if (band >= 8.0) return 'from-emerald-500 to-emerald-700';
    if (band >= 7.0) return 'from-green-500 to-green-700';
    if (band >= 6.0) return 'from-blue-500 to-blue-700';
    if (band >= 5.0) return 'from-amber-500 to-amber-700';
    if (band >= 4.0) return 'from-orange-500 to-orange-700';
    return 'from-red-500 to-red-700';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MockTestResults({
    skill,
    setName,
    testNumber,
    gradeResult,
    timeSpent,
    onBack,
    onRetake,
}: MockTestResultsProps) {
    console.log('[MockTestResults] render called', { skill, bandScore: gradeResult.bandScore });

    const { correct, wrong, unanswered, total, bandScore, results } = gradeResult;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to tests
                    </button>
                    <span className="text-sm font-semibold text-gray-700">
                        {setName} — {skill} Test {testNumber}
                    </span>
                    <button
                        onClick={onRetake}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                    >
                        <RotateCcw className="h-3 w-3" />
                        Retake
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

                {/* ── Top row: Band Score + Donut + Stats ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                    {/* Band Score Card */}
                    <div className={`rounded-2xl bg-gradient-to-br ${getBandColor(bandScore)} p-6 text-white flex flex-col items-center justify-center shadow-lg`}>
                        <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Band Score</span>
                        <span className="text-6xl font-black leading-none">{bandScore.toFixed(1)}</span>
                        <p className="text-xs opacity-80 mt-3 text-center leading-relaxed max-w-[200px]">
                            {getBandMessage(bandScore)}
                        </p>
                    </div>

                    {/* Donut Chart Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col items-center justify-center shadow-sm">
                        <div className="relative">
                            <DonutChart
                                correct={correct}
                                wrong={wrong}
                                unanswered={unanswered}
                                total={total}
                            />
                            {/* Center text overlay */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-gray-900">{correct}/{total}</span>
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Correct</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-center space-y-4">
                        {/* Time */}
                        <div className="text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Time Spent</span>
                            <p className="text-lg font-mono font-bold text-gray-800">{formatTime(timeSpent)}</p>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Breakdown */}
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                                <span className="text-sm text-gray-600 flex-1">Correct</span>
                                <span className="text-sm font-bold text-gray-900">{correct}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                                <span className="text-sm text-gray-600 flex-1">Wrong</span>
                                <span className="text-sm font-bold text-gray-900">{wrong}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-gray-300 shrink-0" />
                                <span className="text-sm text-gray-600 flex-1">Unanswered</span>
                                <span className="text-sm font-bold text-gray-900">{unanswered}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Answer Review Table ── */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-bold text-gray-800">Answer Review</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Compare your answers with the correct ones
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                    <th className="px-4 py-3 text-left font-semibold">Q#</th>
                                    <th className="px-4 py-3 text-left font-semibold">Your Answer</th>
                                    <th className="px-4 py-3 text-left font-semibold">Correct Answer</th>
                                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {results.map((r) => {
                                    const isUnanswered = r.userAnswer === '';
                                    return (
                                        <tr
                                            key={r.questionNumber}
                                            className={
                                                r.isCorrect
                                                    ? 'bg-green-50/50'
                                                    : isUnanswered
                                                        ? 'bg-gray-50/50'
                                                        : 'bg-red-50/50'
                                            }
                                        >
                                            <td className="px-4 py-2.5 font-bold text-gray-700">{r.questionNumber}</td>
                                            <td className="px-4 py-2.5">
                                                {isUnanswered ? (
                                                    <span className="text-gray-300 italic">—</span>
                                                ) : (
                                                    <span className={r.isCorrect ? 'text-green-700 font-medium' : 'text-red-600 font-medium line-through'}>
                                                        {r.userAnswer}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 font-medium text-gray-800">{r.correctAnswer}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                {r.isCorrect ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                                ) : isUnanswered ? (
                                                    <MinusCircle className="h-4 w-4 text-gray-300 mx-auto" />
                                                ) : (
                                                    <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
