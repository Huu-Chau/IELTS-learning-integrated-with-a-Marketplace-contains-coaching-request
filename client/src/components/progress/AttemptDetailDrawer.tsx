/**
 * AttemptDetailDrawer.tsx
 *
 * A slide-in drawer from the right that renders a different detail view
 * depending on the attempt type:
 *  - reading / listening → summary stats + per-question review table
 *  - speaking            → fluency metrics + full transcript + AI evaluation
 *  - manual              → 4-skill band score breakdown
 *  - writing             → handled externally via WritingResultModal
 */

import { useState, useEffect } from 'react';
import {
    X,
    CheckCircle2,
    XCircle,
    MinusCircle,
    Mic,
    BookOpen,
    Headphones,
    Trophy,
    Activity,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuestionReview {
    questionNumber: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
}

interface ReadingListeningAnswers {
    summary: {
        correct: number;
        wrong: number;
        unanswered: number;
        total: number;
    };
    review: QuestionReview[];
}

interface SpeakingTranscriptEntry {
    speaker: 'student' | 'examiner';
    text: string;
}

interface FluencyMetric {
    wordsPerMinute: number;
    pauseCount: number;
    avgPauseDuration: number;
    longestPause: number;
    wordCount: number;
}

interface SpeakingAnswers {
    topic: string;
    part3Theme: string;
    conversationLength: number;
    transcript: SpeakingTranscriptEntry[];
    fluencyMetrics: FluencyMetric[];
}

interface ManualAnswers {
    reading?: number;
    listening?: number;
    writing?: number;
    speaking?: number;
}

export interface AttemptRecord {
    id: number | string;
    type: 'reading' | 'listening' | 'speaking' | 'manual' | 'writing';
    score: number | null;
    feedback: string | null;
    answers: ReadingListeningAnswers | SpeakingAnswers | ManualAnswers | null;
    recordingPath?: string | null;
    testId?: string | null;
    createdAt: string;
}

interface AttemptDetailDrawerProps {
    attempt: AttemptRecord | null;
    onClose: () => void;
    onDelete: (id: number | string) => void;
    getToken: () => Promise<string | null>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBandColor(band: number): string {
    if (band >= 8.0) return 'text-emerald-600';
    if (band >= 7.0) return 'text-green-600';
    if (band >= 6.0) return 'text-blue-600';
    if (band >= 5.0) return 'text-amber-600';
    return 'text-red-500';
}

function getTypeIcon(type: string) {
    switch (type) {
        case 'reading': return <BookOpen className="h-4 w-4" />;
        case 'listening': return <Headphones className="h-4 w-4" />;
        case 'speaking': return <Mic className="h-4 w-4" />;
        case 'manual': return <Trophy className="h-4 w-4" />;
        default: return <Activity className="h-4 w-4" />;
    }
}

function getTypeColor(type: string): string {
    switch (type) {
        case 'reading': return 'bg-blue-100 text-blue-700';
        case 'listening': return 'bg-teal-100 text-teal-700';
        case 'speaking': return 'bg-violet-100 text-violet-700';
        case 'manual': return 'bg-purple-100 text-purple-700';
        default: return 'bg-gray-100 text-gray-700';
    }
}

// ── Sub-views ────────────────────────────────────────────────────────────────

/** Reading / Listening: summary donut + question review table */
function ReadingListeningDetail({ attempt }: { attempt: AttemptRecord }) {
    const answers = attempt.answers as ReadingListeningAnswers | null;

    // Legacy attempts: answers is a flat keymap, not our new structure
    const hasReview = answers && 'summary' in answers && Array.isArray(answers.review);

    if (!hasReview) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 gap-3">
                <BookOpen className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium text-gray-500">Detailed review not available</p>
                <p className="text-xs max-w-xs">
                    This result was saved before detailed reviews were enabled.
                    Retake the test to see a full breakdown.
                </p>
            </div>
        );
    }

    const { summary, review } = answers as ReadingListeningAnswers;

    return (
        <div className="space-y-5">
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-green-600">{summary.correct}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-green-500 mt-0.5">Correct</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-red-500">{summary.wrong}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mt-0.5">Wrong</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-gray-400">{summary.unanswered}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">Skipped</p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
                <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${(summary.correct / summary.total) * 100}%` }}
                />
                <div
                    className="bg-red-400 transition-all"
                    style={{ width: `${(summary.wrong / summary.total) * 100}%` }}
                />
                <div
                    className="bg-gray-200 transition-all"
                    style={{ width: `${(summary.unanswered / summary.total) * 100}%` }}
                />
            </div>

            {/* Per-question review table */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Answer Review</p>
                </div>
                <div className="overflow-y-auto max-h-[360px]">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                                <th className="px-4 py-2 text-left font-semibold">Q#</th>
                                <th className="px-4 py-2 text-left font-semibold">Your Answer</th>
                                <th className="px-4 py-2 text-left font-semibold">Correct</th>
                                <th className="px-4 py-2 text-center font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {review.map((r) => {
                                const isSkipped = !r.userAnswer;
                                return (
                                    <tr
                                        key={r.questionNumber}
                                        className={
                                            r.isCorrect
                                                ? 'bg-green-50/40'
                                                : isSkipped
                                                    ? 'bg-gray-50/40'
                                                    : 'bg-red-50/40'
                                        }
                                    >
                                        <td className="px-4 py-2 font-bold text-gray-700">{r.questionNumber}</td>
                                        <td className="px-4 py-2">
                                            {isSkipped ? (
                                                <span className="text-gray-300 italic">—</span>
                                            ) : (
                                                <span className={r.isCorrect ? 'text-green-700 font-medium' : 'text-red-500 font-medium line-through'}>
                                                    {r.userAnswer}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 font-medium text-gray-800">{r.correctAnswer}</td>
                                        <td className="px-4 py-2 text-center">
                                            {r.isCorrect ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                            ) : isSkipped ? (
                                                <MinusCircle className="h-4 w-4 text-gray-300 mx-auto" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-400 mx-auto" />
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
    );
}

/** Speaking: fluency metrics + transcript + AI evaluation */
function SpeakingDetail({ attempt, getToken }: { attempt: AttemptRecord; getToken: () => Promise<string | null> }) {
    const answers = attempt.answers as SpeakingAnswers | null;
    const transcript = answers?.transcript ?? [];

    // ── Recording playback state ──────────────────────────────────
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioLoading, setAudioLoading] = useState(false);
    const [audioError, setAudioError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function fetchRecordingUrl() {
            console.log('[SpeakingDetail] fetchRecordingUrl called', { attemptId: attempt.id });
            // Only fetch if there's a recording path on the attempt
            if (!attempt.recordingPath) {
                console.log('[SpeakingDetail] fetchRecordingUrl: no recordingPath, skipping');
                return;
            }

            setAudioLoading(true);
            setAudioError(false);

            try {
                const token = await getToken();
                const API_BASE = (import.meta.env.VITE_API_URL as string || 'http://localhost:5000/api').replace(/\/api$/, '');
                const res = await fetch(`${API_BASE}/api/attempts/${attempt.id}/recording-url`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (!res.ok) {
                    console.log('[SpeakingDetail] fetchRecordingUrl: API returned non-ok', { status: res.status });
                    setAudioError(true);
                    return;
                }

                const data = await res.json();
                if (!cancelled && data.url) {
                    console.log('[SpeakingDetail] fetchRecordingUrl success', { urlPrefix: data.url.substring(0, 80) });
                    setAudioUrl(data.url);
                }
            } catch (err) {
                console.error('[SpeakingDetail] fetchRecordingUrl error', err);
                if (!cancelled) setAudioError(true);
            } finally {
                if (!cancelled) setAudioLoading(false);
            }
        }

        fetchRecordingUrl();
        return () => { cancelled = true; };
    }, [attempt.id, attempt.recordingPath, getToken]);

    // Compute average fluency
    const metrics = answers?.fluencyMetrics ?? [];
    const avgWPM = metrics.length > 0
        ? Math.round(metrics.reduce((s, m) => s + m.wordsPerMinute, 0) / metrics.length)
        : null;
    const totalPauses = metrics.reduce((s, m) => s + m.pauseCount, 0);
    const totalWords = metrics.reduce((s, m) => s + m.wordCount, 0);

    return (
        <div className="space-y-5">
            {/* Topic */}
            {answers?.topic && (
                <div className="bg-violet-50 rounded-xl px-4 py-3 border border-violet-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-1">Topic</p>
                    <p className="text-sm font-semibold text-violet-900">{answers.topic}</p>
                    {answers.part3Theme && (
                        <p className="text-xs text-violet-500 mt-0.5">Part 3: {answers.part3Theme}</p>
                    )}
                </div>
            )}

            {/* Fluency metrics */}
            {avgWPM !== null && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xl font-black text-gray-800">{avgWPM}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">WPM</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xl font-black text-gray-800">{totalWords}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">Words</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xl font-black text-gray-800">{totalPauses}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">Pauses</p>
                    </div>
                </div>
            )}

            {/* Recording Playback */}
            {audioLoading && (
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-400 animate-pulse">Loading recording...</p>
                </div>
            )}
            {audioUrl && !audioLoading && (
                <div className="rounded-xl border border-violet-100 overflow-hidden bg-violet-50/30">
                    <div className="bg-violet-50 px-4 py-2.5 border-b border-violet-100 flex items-center gap-2">
                        <Mic className="h-3.5 w-3.5 text-violet-500" />
                        <p className="text-xs font-bold uppercase tracking-wider text-violet-500">Session Recording</p>
                    </div>
                    <div className="px-4 py-3">
                        <audio
                            controls
                            src={audioUrl}
                            className="w-full h-10"
                            preload="metadata"
                            onError={() => {
                                console.log('[SpeakingDetail] audio element error — URL may be expired');
                                setAudioUrl(null);
                                setAudioError(true);
                            }}
                        />
                    </div>
                </div>
            )}
            {audioError && !audioLoading && (
                <div className="bg-red-50/50 rounded-xl px-4 py-2.5 border border-red-100">
                    <p className="text-xs text-red-400">Recording unavailable or expired.</p>
                </div>
            )}

            {/* AI Evaluation */}
            {attempt.feedback && (
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">AI Evaluation</p>
                    </div>
                    <div className="px-4 py-3 max-h-52 overflow-y-auto">
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{attempt.feedback}</p>
                    </div>
                </div>
            )}

            {/* Transcript */}
            {transcript.length > 0 && (
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                            Conversation Transcript
                        </p>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                        {transcript.map((entry, idx) => {
                            const isExaminer = entry.speaker === 'examiner';
                            return (
                                <div
                                    key={idx}
                                    className={`px-4 py-2.5 flex gap-3 ${isExaminer ? 'bg-white' : 'bg-violet-50/30'}`}
                                >
                                    <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 w-16 mt-0.5 ${isExaminer ? 'text-gray-400' : 'text-violet-500'}`}>
                                        {isExaminer ? 'Examiner' : 'You'}
                                    </span>
                                    <p className="text-xs text-gray-700 leading-relaxed">{entry.text}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

/** Manual: 4-skill band score breakdown */
function ManualDetail({ attempt }: { attempt: AttemptRecord }) {
    const answers = attempt.answers as ManualAnswers | null;

    const skills = [
        { key: 'reading' as const, label: 'Reading', color: 'bg-blue-500' },
        { key: 'listening' as const, label: 'Listening', color: 'bg-teal-500' },
        { key: 'writing' as const, label: 'Writing', color: 'bg-amber-500' },
        { key: 'speaking' as const, label: 'Speaking', color: 'bg-violet-500' },
    ];

    return (
        <div className="space-y-3">
            <p className="text-xs text-gray-400 font-medium">Individual skill band scores from your official exam.</p>
            {skills.map(({ key, label, color }) => {
                const score = answers?.[key] ?? null;
                const pct = score ? (score / 9) * 100 : 0;
                return (
                    <div key={key} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">{label}</span>
                            <span className={`text-lg font-black ${score ? getBandColor(score) : 'text-gray-300'}`}>
                                {score ?? '—'}
                            </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                                className={`h-full rounded-full ${color} transition-all duration-700`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Main Drawer Component ────────────────────────────────────────────────────

export default function AttemptDetailDrawer({ attempt, onClose, onDelete, getToken }: AttemptDetailDrawerProps) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Reset confirm state whenever a different attempt is opened
    useEffect(() => { setConfirmDelete(false); }, [attempt?.id]);

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const isOpen = !!attempt;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Drawer panel */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-[600px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {attempt && (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getTypeColor(attempt.type)}`}>
                                    {getTypeIcon(attempt.type)}
                                    {attempt.type.charAt(0).toUpperCase() + attempt.type.slice(1)}
                                </span>
                                {attempt.score !== null && attempt.score !== undefined && (
                                    <span className={`text-2xl font-black ${getBandColor(attempt.score)}`}>
                                        {attempt.score}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Delete button — two-step confirm */}
                                {confirmDelete ? (
                                    <>
                                        <span className="text-sm text-red-500 font-medium mr-2 whitespace-nowrap">Delete this attempt?</span>
                                        <button
                                            onClick={async () => {
                                                console.log('[AttemptDetailDrawer] delete confirmed', { id: attempt.id });
                                                setDeleting(true);
                                                try {
                                                    const token = await getToken();
                                                    const API_BASE = (import.meta.env.VITE_API_URL as string || 'http://localhost:5000/api').replace(/\/api$/, '');
                                                    const res = await fetch(`${API_BASE}/api/attempts/${attempt.id}`, {
                                                        method: 'DELETE',
                                                        headers: { 'Authorization': `Bearer ${token}` },
                                                    });
                                                    if (res.ok || res.status === 204) {
                                                        console.log('[AttemptDetailDrawer] delete success', { id: attempt.id });
                                                        onDelete(attempt.id);
                                                        onClose();
                                                    } else {
                                                        console.error('[AttemptDetailDrawer] delete failed', { status: res.status });
                                                        setConfirmDelete(false);
                                                    }
                                                } catch (err) {
                                                    console.error('[AttemptDetailDrawer] delete error', err);
                                                    setConfirmDelete(false);
                                                } finally {
                                                    setDeleting(false);
                                                }
                                            }}
                                            disabled={deleting}
                                            className="px-3 py-1.5 text-sm font-bold rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                                        >
                                            {deleting ? '...' : 'Yes, delete'}
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(false)}
                                            className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        id={`delete-attempt-${attempt.id}`}
                                        onClick={() => setConfirmDelete(true)}
                                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                                        aria-label="Delete attempt"
                                        title="Delete this attempt"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                            <path d="M10 11v6M14 11v6" />
                                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                        </svg>
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                    aria-label="Close detail panel"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Date sub-header */}
                        <div className="px-5 py-2.5 border-b border-gray-50 bg-gray-50/50 shrink-0">
                            <p className="text-xs text-gray-400">
                                {new Date(attempt.createdAt).toLocaleDateString('en-GB', {
                                    day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </p>
                        </div>

                        {/* Body — type-specific content */}
                        <div className="flex-1 overflow-y-auto px-5 py-5">
                            {(attempt.type === 'reading' || attempt.type === 'listening') && (
                                <ReadingListeningDetail attempt={attempt} />
                            )}
                            {attempt.type === 'speaking' && (
                                <SpeakingDetail attempt={attempt} getToken={getToken} />
                            )}
                            {attempt.type === 'manual' && (
                                <ManualDetail attempt={attempt} />
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}