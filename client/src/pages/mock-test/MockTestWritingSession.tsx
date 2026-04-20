/**
 * MockTestWritingSession.tsx
 *
 * Mock Test > Writing session page.
 * Reached via: /mock-test/writing/session?setId=cambridge-20&test=1
 *
 * Owns its own DashboardLayout (NOT a re-export wrapper) to prevent the
 * double-sidebar recursion bug. Includes full AI evaluation via streaming
 * from Ollama (gemma3:12b), same as PracticeWritingSession.
 *
 * NOTE: Real task prompts per set+test will be wired in once materials are
 * provided. For now the shell renders with placeholder prompts.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    FileText, RefreshCw, Send, Loader2, ArrowLeft,
    AlertTriangle, CheckCircle, Timer,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';

// ─── Types ────────────────────────────────────────────────────────────────────
type WritingPart = 'part1' | 'part2';
type EvalStatus = 'idle' | 'ready' | 'evaluating' | 'done' | 'error';

interface TaskPrompt {
    part: 1 | 2;
    question: string;
}

const API_BASE = (import.meta.env.VITE_API_URL as string || 'http://localhost:5000/api').replace(/\/api$/, '');
const MIN_WORDS: Record<WritingPart, number> = { part1: 150, part2: 250 };
const CRITERIA_TABS = ['All Feedback', 'Task / Achievement', 'Coherence & Cohesion', 'Lexical Resource', 'Grammar'];

function countWords(text: string): number {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function formatSetName(setId: string): string {
    return setId
        .replace(/^cambridge-/, 'Cambridge IELTS ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MockTestWritingSession() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const setId = searchParams.get('setId') ?? 'cambridge-20';
    const testNumber = searchParams.get('test') ?? '1';
    const setName = formatSetName(setId);

    // Active task tab: 1 or 2
    const [activeTask, setActiveTask] = useState<1 | 2>(1);

    // Per-task state
    const [essays, setEssays] = useState<Record<1 | 2, string>>({ 1: '', 2: '' });
    const [statuses, setStatuses] = useState<Record<1 | 2, EvalStatus>>({ 1: 'ready', 2: 'ready' });
    const [feedbacks, setFeedbacks] = useState<Record<1 | 2, string>>({ 1: '', 2: '' });
    const [errorMsgs, setErrorMsgs] = useState<Record<1 | 2, string>>({ 1: '', 2: '' });
    const [activeTabs, setActiveTabs] = useState<Record<1 | 2, number>>({ 1: 0, 2: 0 });

    const feedbackRef = useRef<HTMLDivElement>(null);

    // Placeholder prompts — replaced when real materials are seeded
    const [prompts] = useState<Record<1 | 2, TaskPrompt>>({
        1: {
            part: 1,
            question: 'Task 1 prompt for this test set is being prepared. Check back soon.',
        },
        2: {
            part: 2,
            question: 'Task 2 prompt for this test set is being prepared. Check back soon.',
        },
    });

    useEffect(() => {
        console.log('[MockTestWritingSession] mounted', { setId, testNumber });
        // Future: fetch(`${API_BASE}/api/mock-materials?skill=writing&setId=${setId}&test=${testNumber}`)
        // and populate `prompts` state from response.
    }, [setId, testNumber]);

    const essay = essays[activeTask];
    const status = statuses[activeTask];
    const part: WritingPart = activeTask === 1 ? 'part1' : 'part2';
    const minWords = MIN_WORDS[part];
    const wordCount = countWords(essay);
    const wordProgress = Math.min((wordCount / minWords) * 100, 100);

    const handleSubmit = useCallback(async () => {
        const currentEssay = essays[activeTask];
        if (!currentEssay.trim()) return;
        console.log('[MockTestWritingSession] handleSubmit called', { activeTask, part, wordCount });

        setStatuses(s => ({ ...s, [activeTask]: 'evaluating' }));
        setFeedbacks(f => ({ ...f, [activeTask]: '' }));
        setErrorMsgs(e => ({ ...e, [activeTask]: '' }));
        setActiveTabs(t => ({ ...t, [activeTask]: 0 }));

        const task = {
            part,
            taskType: part === 'part1' ? 'Data Report' : 'Essay',
            prompt: prompts[activeTask].question,
        };

        try {
            const res = await fetch(`${API_BASE}/api/evaluate/writing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ essay: currentEssay, part, wordCount: countWords(currentEssay), task }),
            });
            if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const json = line.slice(6).trim();
                    if (!json) continue;
                    try {
                        const parsed = JSON.parse(json);
                        if (parsed.chunk) {
                            setFeedbacks(f => {
                                const updated = { ...f, [activeTask]: f[activeTask] + parsed.chunk };
                                setTimeout(() => {
                                    feedbackRef.current?.scrollTo({ top: feedbackRef.current.scrollHeight, behavior: 'smooth' });
                                }, 50);
                                return updated;
                            });
                        }
                        if (parsed.error) {
                            setErrorMsgs(e => ({ ...e, [activeTask]: parsed.error }));
                            setStatuses(s => ({ ...s, [activeTask]: 'error' }));
                            return;
                        }
                        if (parsed.done) {
                            setStatuses(s => ({ ...s, [activeTask]: 'done' }));
                            console.log('[MockTestWritingSession] evaluation complete', { activeTask });
                        }
                    } catch { /* non-JSON line */ }
                }
            }
            setStatuses(s => ({ ...s, [activeTask]: 'done' }));
        } catch (err) {
            console.error('[MockTestWritingSession] handleSubmit error', err);
            setErrorMsgs(e => ({ ...e, [activeTask]: 'Evaluation failed. Make sure Ollama is running with gemma3:12b.' }));
            setStatuses(s => ({ ...s, [activeTask]: 'error' }));
        }
    }, [essays, activeTask, part, prompts]);

    const feedback = feedbacks[activeTask];
    const errorMsg = errorMsgs[activeTask];
    const activeTab = activeTabs[activeTask];

    return (
        <DashboardLayout role="student">
            <div className="max-w-3xl space-y-6">
                {/* ── Violet exam banner ─── */}
                <div className="bg-violet-600 text-white px-5 py-2.5 flex items-center justify-between text-sm font-medium rounded-xl">
                    <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 shrink-0" />
                        <span>IELTS Mock Test — Writing Module</span>
                    </div>
                    <span className="bg-violet-500 px-3 py-0.5 rounded-full text-xs font-semibold tracking-wide shrink-0">
                        ~60 min
                    </span>
                </div>

                {/* ── Back ─── */}
                <button
                    onClick={() => navigate('/mock-test/writing')}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Writing tests
                </button>

                {/* ── Header ─── */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-rose-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">
                            {setName} — Writing Test {testNumber}
                        </h1>
                        <p className="text-xs text-rose-500 font-medium">Task 1 + Task 2 · 60 min total · AI graded</p>
                    </div>
                </div>

                {/* ── Task tabs ─── */}
                <div className="flex gap-2">
                    {([1, 2] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveTask(t)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors border ${activeTask === t
                                ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-100'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-rose-200 hover:text-rose-500'
                                }`}
                        >
                            Task {t}
                            {statuses[t] === 'done' && (
                                <CheckCircle className="inline h-3.5 w-3.5 ml-1.5 mb-0.5" />
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Task prompt ─── */}
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-5">
                    <span className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-2 block">
                        Task {activeTask} — {activeTask === 1 ? 'Describe a visual (min 150 words)' : 'Write an essay (min 250 words)'}
                    </span>
                    <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">
                        {prompts[activeTask].question}
                    </p>
                </div>

                {/* ── Essay input ─── */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-gray-700">Your Response</label>
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ${wordCount >= minWords ? 'bg-green-500' : 'bg-amber-400'}`}
                                    style={{ width: `${wordProgress}%` }}
                                />
                            </div>
                            <span className={`text-xs font-mono font-bold ${wordCount >= minWords ? 'text-green-600' : 'text-amber-600'}`}>
                                {wordCount} / {minWords} words
                            </span>
                        </div>
                    </div>
                    <textarea
                        value={essay}
                        onChange={e => setEssays(s => ({ ...s, [activeTask]: e.target.value }))}
                        rows={14}
                        placeholder={`Write your ${activeTask === 1 ? 'report (min 150 words)' : 'essay (min 250 words)'} here...`}
                        disabled={status === 'evaluating'}
                        className="w-full rounded-xl border border-gray-200 p-4 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent resize-none transition-all disabled:opacity-60 disabled:bg-gray-50 font-sans leading-relaxed shadow-sm"
                    />
                    {wordCount > 0 && wordCount < minWords && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />{minWords - wordCount} more words needed.
                        </p>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={status === 'evaluating' || !essay.trim() || wordCount < 50}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-500 hover:bg-rose-600 active:scale-[0.99] text-white rounded-xl font-semibold transition-all shadow-lg shadow-rose-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        {status === 'evaluating' ? (
                            <><Loader2 className="w-5 h-5 animate-spin" />Evaluating with Gemma 3:12b...</>
                        ) : (
                            <><Send className="w-5 h-5" />Submit for AI Evaluation</>
                        )}
                    </button>
                </div>

                {/* ── Error ─── */}
                {status === 'error' && errorMsg && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{errorMsg}</p>
                    </div>
                )}

                {/* ── Feedback panel ─── */}
                {(status === 'evaluating' || status === 'done') && feedback && (
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="flex border-b border-gray-100 overflow-x-auto">
                            {CRITERIA_TABS.map((tab, i) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTabs(t => ({ ...t, [activeTask]: i }))}
                                    className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${activeTab === i
                                        ? 'border-rose-500 text-rose-700 bg-rose-50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        {status === 'evaluating' && (
                            <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 border-b border-amber-100 text-amber-700 text-xs">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />Gemma is evaluating — 30–90 seconds...
                            </div>
                        )}
                        {status === 'done' && (
                            <div className="flex items-center gap-2 px-5 py-2.5 bg-green-50 border-b border-green-100 text-green-700 text-xs font-medium">
                                <CheckCircle className="w-3.5 h-3.5" />Evaluation complete
                            </div>
                        )}
                        <div
                            ref={feedbackRef}
                            className="p-6 overflow-y-auto max-h-[600px] text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans"
                        >
                            {feedback}
                            {status === 'evaluating' && (
                                <span className="inline-block w-2 h-4 bg-rose-500 animate-pulse rounded-sm ml-0.5 align-text-bottom" />
                            )}
                        </div>
                    </div>
                )}

                {/* ── Retry ─── */}
                {status === 'done' && (
                    <button
                        onClick={() => {
                            setEssays(s => ({ ...s, [activeTask]: '' }));
                            setFeedbacks(f => ({ ...f, [activeTask]: '' }));
                            setStatuses(st => ({ ...st, [activeTask]: 'ready' }));
                            setActiveTabs(t => ({ ...t, [activeTask]: 0 }));
                        }}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" /> Try again with a new response
                    </button>
                )}

                {/* ── Exam conditions ─── */}
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-800">
                    <p className="font-semibold mb-1">Exam conditions</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
                        <li>Task 1: minimum 150 words, suggested 20 minutes</li>
                        <li>Task 2: minimum 250 words, suggested 40 minutes</li>
                        <li>Do not use bullet points — write in full paragraphs</li>
                    </ol>
                </div>
            </div>
        </DashboardLayout>
    );
}
