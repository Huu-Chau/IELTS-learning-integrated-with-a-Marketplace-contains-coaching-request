import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import {
    X, FileText, MessageSquare, Star, Loader2,
    AlertTriangle, ExternalLink, BookOpen, ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionDetails {
    id: string;
    book: string;
    testNumber: number;
    status: 'in-progress' | 'completed' | 'abandoned';
    task1Band: number | null;
    task2Band: number | null;
    overallBand: number | null;
    createdAt: string;
    endTime: string | null;
    task1EssayUrl: string | null;
    task1FeedbackUrl: string | null;
    task2EssayUrl: string | null;
    task2FeedbackUrl: string | null;
}

interface TaskContent {
    essay: string;
    feedback: string;
}

interface WritingResultModalProps {
    sessionId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

// ─── Helper: fetch plain-text from a public presigned URL ─────────────────────

async function fetchText(url: string | null): Promise<string> {
    if (!url) return '';
    try {
        const res = await fetch(url);
        if (!res.ok) return '';
        return await res.text();
    } catch {
        return '';
    }
}

// ─── Band Badge ───────────────────────────────────────────────────────────────

function BandBadge({ band, size = 'md' }: { band: number | null; size?: 'sm' | 'md' | 'lg' }) {
    if (band === null) return <span className="text-gray-400 text-sm">N/A</span>;

    const colour =
        band >= 7.5 ? 'from-emerald-500 to-teal-500' :
        band >= 6   ? 'from-blue-500 to-indigo-500' :
        band >= 5   ? 'from-amber-500 to-orange-500' :
                      'from-red-500 to-rose-500';

    const sizes = { sm: 'text-sm px-2 py-0.5', md: 'text-base px-3 py-1', lg: 'text-3xl font-extrabold px-5 py-2' };

    return (
        <span className={`inline-block rounded-full bg-gradient-to-r ${colour} text-white font-bold ${sizes[size]}`}>
            {band}
        </span>
    );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function WritingResultModal({ sessionId, isOpen, onClose }: WritingResultModalProps) {
    const { getIdToken } = useAuth();
    const navigate = useNavigate();

    const [session, setSession] = useState<SessionDetails | null>(null);
    const [task1, setTask1] = useState<TaskContent>({ essay: '', feedback: '' });
    const [task2, setTask2] = useState<TaskContent>({ essay: '', feedback: '' });
    const [activeTask, setActiveTask] = useState<1 | 2>(1);
    const [activeView, setActiveView] = useState<'essay' | 'feedback'>('feedback');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ─── Fetch session details when modal opens ────────────────────────────────

    useEffect(() => {
        if (!isOpen || !sessionId) {
            // Reset on close
            setSession(null);
            setTask1({ essay: '', feedback: '' });
            setTask2({ essay: '', feedback: '' });
            setActiveTask(1);
            setActiveView('feedback');
            setError('');
            return;
        }

        const load = async () => {
            console.log('[WritingResultModal] load called', { sessionId });
            setLoading(true);
            setError('');
            try {
                const token = await getIdToken();
                const details: SessionDetails = await apiClient.get(
                    `/evaluate/writing/session/${sessionId}/details`,
                    token,
                );

                setSession(details);

                // Fetch raw text from presigned MinIO URLs in parallel
                const [essayT1, feedbackT1, essayT2, feedbackT2] = await Promise.all([
                    fetchText(details.task1EssayUrl),
                    fetchText(details.task1FeedbackUrl),
                    fetchText(details.task2EssayUrl),
                    fetchText(details.task2FeedbackUrl),
                ]);

                setTask1({ essay: essayT1, feedback: feedbackT1 });
                setTask2({ essay: essayT2, feedback: feedbackT2 });
                console.log('[WritingResultModal] load success', { sessionId });
            } catch (err) {
                console.error('[WritingResultModal] load error', err);
                setError('Could not load session details. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [isOpen, sessionId]);

    if (!isOpen) return null;

    const currentTask = activeTask === 1 ? task1 : task2;
    const currentBand = activeTask === 1 ? session?.task1Band : session?.task2Band;

    return (
        // Backdrop
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Modal card */}
            <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in-up">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 leading-tight">
                                {session ? `${session.book} — Test ${session.testNumber}` : 'Writing Evaluation'}
                            </h2>
                            <p className="text-xs text-gray-400">
                                {session?.endTime
                                    ? `Completed ${new Date(session.endTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                    : 'Loading…'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Overall band hero */}
                        {session && (
                            <div className="text-center">
                                <p className="text-xs text-gray-400 mb-1">Overall Band</p>
                                {session.overallBand ? (
                                    <BandBadge band={session.overallBand} size="lg" />
                                ) : (
                                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Partial Test</span>
                                )}
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Loading / Error / Content ───────────────────────────── */}
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <p className="text-sm">Loading your evaluation…</p>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-red-500">
                        <AlertTriangle className="w-8 h-8" />
                        <p className="text-sm">{error}</p>
                    </div>
                ) : (
                    <>
                        {/* ── Task Tab Bar ───────────────────────────────── */}
                        <div className="flex items-center gap-1 px-6 pt-4 pb-0 border-b border-gray-100 shrink-0">
                            {([1, 2] as const).map((t) => {
                                const band = (t === 1 ? session?.task1Band : session?.task2Band) ?? null;
                                const isActive = activeTask === t;
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setActiveTask(t)}
                                        className={`flex items-center gap-2 px-4 pb-3 pt-1 text-sm font-medium border-b-2 transition-colors ${
                                            isActive
                                                ? 'border-indigo-600 text-indigo-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Task {t}
                                        {band !== null && <BandBadge band={band} size="sm" />}
                                    </button>
                                );
                            })}

                            {/* View toggle (push right) */}
                            <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1 mb-2">
                                <button
                                    onClick={() => setActiveView('feedback')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                                        activeView === 'feedback'
                                            ? 'bg-white text-indigo-700 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Feedback
                                </button>
                                <button
                                    onClick={() => setActiveView('essay')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                                        activeView === 'essay'
                                            ? 'bg-white text-indigo-700 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    My Essay
                                </button>
                            </div>
                        </div>

                        {/* ── Scrollable Content Area ────────────────────── */}
                        <div className="flex-1 overflow-y-auto">
                            {activeView === 'essay' ? (
                                /* ─ Essay Panel ─ */
                                <div className="px-6 py-5">
                                    {currentTask.essay ? (
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-mono">
                                            {currentTask.essay}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-12 text-gray-400">
                                            <FileText className="w-10 h-10 mb-2 opacity-40" />
                                            <p className="text-sm">Did not attempt Task {activeTask}.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* ─ Feedback Panel ─ */
                                <div className="px-6 py-5">
                                    {/* Band summary strip */}
                                    <div className="flex items-center gap-3 mb-5 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                                        <Star className="w-5 h-5 text-indigo-500 shrink-0" />
                                        <span className="text-sm font-medium text-indigo-700">
                                            Task {activeTask} Band Score:
                                        </span>
                                        <BandBadge band={currentBand ?? null} size="sm" />
                                    </div>

                                    {/* Markdown feedback */}
                                    {currentTask.feedback ? (
                                        <article className="prose prose-sm prose-indigo max-w-none text-gray-700">
                                            <ReactMarkdown>
                                                {currentTask.feedback}
                                            </ReactMarkdown>
                                        </article>
                                    ) : (
                                        <div className="flex flex-col items-center py-12 text-gray-400">
                                            <MessageSquare className="w-10 h-10 mb-2 opacity-40" />
                                            <p className="text-sm">Did not attempt Task {activeTask}.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Footer CTA ─────────────────────────────────── */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                            <p className="text-xs text-gray-500">
                                Want a deeper review from a certified IELTS examiner?
                            </p>
                            <button
                                onClick={() => { onClose(); navigate('/marketplace'); }}
                                className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                            >
                                Request Expert Review
                                <ChevronRight className="w-4 h-4" />
                                <ExternalLink className="w-3.5 h-3.5 opacity-75" />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
