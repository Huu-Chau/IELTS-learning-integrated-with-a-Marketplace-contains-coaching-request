/**
 * MockTestWritingSession.tsx
 *
 * Mock Test > Writing session page.
 * Reached via: /mock-test/writing/session?setId=cambridge-20&test=1
 *
 * Implements a split-pane UI (Prompt on left, editor on right)
 * Fetches dynamic Cambridge JSON data and seamlessly streams MinIO images
 * for Task 1 diagrams or maps, while evaluating via Ollama.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
    FileText, RefreshCw, Send, Loader2, ArrowLeft,
    AlertTriangle, CheckCircle, Timer,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useTestDraft } from '@/hooks/useTestDraft';

// ─── Types ────────────────────────────────────────────────────────────────────
type WritingPart = 'part1' | 'part2';
type EvalStatus = 'idle' | 'ready' | 'evaluating' | 'done' | 'error';

interface VisualData {
    type: string;
    title: string;
    src: string;
    description: string;
}

interface WritingTask {
    task_number: number;
    instructions: string;
    prompt?: string;
    visual_data?: VisualData[];
}

interface WritingTest {
    test_number: number;
    tasks: WritingTask[];
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
    const bookNum = setId.match(/\d+/)?.[0] ?? '20';

    const [activeTask, setActiveTask] = useState<1 | 2>(1);

    // ── Draft persistence: essays + timer survive page refresh ───────────────
    // Essays are stored as { '1': '...task1 text...', '2': '...task2 text...' }
    const { answers: essayMap, setAnswers: setEssayMap, secondsLeft, timerExpired, clearDraft } = useTestDraft({
        skill: 'writing',
        setId,
        testNumber,
        totalSeconds: 3600, // 60 min
    });

    // Typed convenience helpers so the rest of the component keeps using
    // essays[1] / essays[2] notation without changes.
    const essays: Record<1 | 2, string> = {
        1: essayMap['1'] ?? '',
        2: essayMap['2'] ?? '',
    };
    const setEssays = (updater: ((prev: Record<1 | 2, string>) => Record<1 | 2, string>) | Record<1 | 2, string>) => {
        const next = typeof updater === 'function' ? updater(essays) : updater;
        setEssayMap({ '1': next[1], '2': next[2] });
    };

    const timerMins = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
    const timerSecs = (secondsLeft % 60).toString().padStart(2, '0');
    const timerColor = secondsLeft <= 300
        ? 'text-red-600 bg-red-50 border-red-200'
        : secondsLeft <= 600
            ? 'text-amber-600 bg-amber-50 border-amber-200'
            : 'text-gray-600 bg-gray-50 border-gray-200';

    // Test Data State
    const [testData, setTestData] = useState<WritingTest | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [dataError, setDataError] = useState('');

    const { user } = useAuth();

    // Per-task state (evaluation status — these don't need to persist)
    const [statuses, setStatuses] = useState<Record<1 | 2, EvalStatus>>({ 1: 'ready', 2: 'ready' });
    const [feedbacks, setFeedbacks] = useState<Record<1 | 2, string>>({ 1: '', 2: '' });
    const [errorMsgs, setErrorMsgs] = useState<Record<1 | 2, string>>({ 1: '', 2: '' });
    const [activeTabs, setActiveTabs] = useState<Record<1 | 2, number>>({ 1: 0, 2: 0 });

    // Session ID from backend (created when test data loads)
    const [sessionId, setSessionId] = useState<string | null>(null);

    const feedbackRef = useRef<HTMLDivElement>(null);

    // Initial Data Fetch
    useEffect(() => {
        let mounted = true;
        setIsLoadingData(true);
        setDataError('');

        async function fetchTestData() {
            try {
                // E.g. GET /api/cambridge-tests/writing/Cambridge%2020
                const bookQuery = `Cambridge ${bookNum}`;
                const res = await fetch(`${API_BASE}/api/cambridge-tests/writing/${encodeURIComponent(bookQuery)}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                const t = data.tests.find((t: any) => t.test_number === parseInt(testNumber));
                if (t && mounted) {
                    setTestData(t);
                } else if (!t && mounted) {
                    setDataError('Test data not found in database.');
                }
            } catch (err) {
                console.error('Failed to load test data:', err);
                if (mounted) setDataError('Failed to load test. Make sure the database is seeded.');
            } finally {
                if (mounted) setIsLoadingData(false);
            }
        }
        fetchTestData();
        return () => { mounted = false; };
    }, [setId, testNumber, bookNum]);

    // Once testData is loaded and we have a userId, create a WritingSession on the backend.
    // The returned sessionId is used as the MinIO folder name and DB key.
    useEffect(() => {
        if (!testData || !user?.uid || sessionId) return;
        const bookQuery = `Cambridge ${bookNum}`;
        console.log('[MockTestWritingSession] startSession called', { book: bookQuery, testNumber, userId: user.uid });

        fetch(`${API_BASE}/api/evaluate/writing/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid, book: bookQuery, testNumber: parseInt(testNumber) }),
        })
            .then(r => r.json())
            .then(data => {
                if (data.sessionId) {
                    setSessionId(data.sessionId);
                    console.log('[MockTestWritingSession] startSession success', { sessionId: data.sessionId });
                }
            })
            .catch(err => console.error('[MockTestWritingSession] startSession error', err));
    }, [testData, user, bookNum, testNumber, sessionId]);

    // Timer is managed by useTestDraft hook
    useEffect(() => {
        if (timerExpired && statuses[activeTask] !== 'evaluating' && statuses[activeTask] !== 'done' && testData) {
            console.log('[MockTestWritingSession] Timer expired — auto-submitting active task');
            handleSubmit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timerExpired]);

    const activeTaskData = testData?.tasks?.find(t => t.task_number === activeTask);

    const essay = essays[activeTask];
    const status = statuses[activeTask];
    const part: WritingPart = activeTask === 1 ? 'part1' : 'part2';
    const minWords = MIN_WORDS[part];
    const wordCount = countWords(essay);
    const wordProgress = Math.min((wordCount / minWords) * 100, 100);

    const handleSubmit = useCallback(async () => {
        const currentEssay = essays[activeTask];
        if (!currentEssay.trim() || !activeTaskData) return;

        setStatuses(s => ({ ...s, [activeTask]: 'evaluating' }));
        setFeedbacks(f => ({ ...f, [activeTask]: '' }));
        setErrorMsgs(e => ({ ...e, [activeTask]: '' }));
        setActiveTabs(t => ({ ...t, [activeTask]: 0 }));

        // Pass instruction and prompt together for context
        const contextPrompt = `${activeTaskData.instructions}\n\n${activeTaskData.prompt || ''}`;

        const task = {
            part,
            taskType: part === 'part1' ? 'Data Report' : 'Essay',
            prompt: contextPrompt,
            dataDescription: activeTaskData.visual_data?.[0]?.description ?? '',
        };

        if (!sessionId || !user?.uid) {
            setErrorMsgs(e => ({ ...e, [activeTask]: 'Session not ready. Please wait a moment and try again.' }));
            setStatuses(s => ({ ...s, [activeTask]: 'error' }));
            return;
        }

        try {
            console.log('[MockTestWritingSession] handleSubmit called', { sessionId, taskNumber: activeTask, userId: user.uid });
            const res = await fetch(`${API_BASE}/api/evaluate/writing/${sessionId}/evaluate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    essay: currentEssay,
                    taskNumber: activeTask,
                    wordCount: countWords(currentEssay),
                    task,
                    userId: user.uid,
                }),
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
                    } catch { /* skip non-json */ }
                }
            }
            setStatuses(s => ({ ...s, [activeTask]: 'done' }));
            clearDraft(); // ── Wipe saved draft on successful submit
        } catch (err) {
            console.error('Submit error:', err);
            setErrorMsgs(e => ({ ...e, [activeTask]: 'Evaluation failed. Make sure Ollama is running.' }));
            setStatuses(s => ({ ...s, [activeTask]: 'error' }));
        }
    }, [essays, activeTask, part, activeTaskData, clearDraft]);

    const feedback = feedbacks[activeTask];
    const errorMsg = errorMsgs[activeTask];
    const activeTab = activeTabs[activeTask];

    return (
        <DashboardLayout role="student">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* ── Back ─── */}
                <button
                    onClick={() => navigate('/mock-test/writing')}
                    className="flex items-center w-fit gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 hover:-translate-x-1 transition-all"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Writing tests
                </button>

                {/* ── Header ─── */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-rose-500" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">
                                {setName} — Writing Test {testNumber}
                            </h1>
                            <p className="text-xs text-rose-500 font-medium">Task 1 (150w) + Task 2 (250w) · AI Evaluated</p>
                        </div>
                    </div>

                    {/* ── Live Countdown Timer ─── */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-lg transition-colors shrink-0 ${timerColor}`}>
                        <Timer className="h-4 w-4 shrink-0" />
                        <span>
                            {timerExpired ? 'Time\'s up!' : `${timerMins}:${timerSecs}`}
                        </span>
                    </div>
                </div>

                {/* ── Task tabs ─── */}
                <div className="flex gap-2">
                    {([1, 2] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveTask(t)}
                            className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-colors border ${activeTask === t
                                ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-200'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-rose-200 hover:text-rose-500'
                                }`}
                        >
                            Task {t}
                            {statuses[t] === 'done' && (
                                <CheckCircle className="inline h-3.5 w-3.5 ml-2 mb-0.5" />
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Main Layout: Split Screen ─── */}
                {isLoadingData ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="h-8 w-8 animate-spin mb-4" />
                        <p>Loading test materials...</p>
                    </div>
                ) : dataError ? (
                    <div className="py-20 flex flex-col items-center justify-center text-red-500">
                        <AlertTriangle className="h-8 w-8 mb-4" />
                        <p>{dataError}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                        {/* ── Left Side: Prompt & Visuals ─── */}
                        <div className="flex flex-col gap-4">
                            <div className="bg-white border text-gray-800 border-gray-200 rounded-2xl p-6 shadow-sm">
                                <span className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-3 block">
                                    IELTS Writing Task {activeTask}
                                </span>

                                {activeTaskData && (
                                    <div className="space-y-6">
                                        <p className="text-sm font-semibold leading-relaxed">
                                            {activeTaskData.instructions}
                                        </p>

                                        {/* Task 1 Graphics */}
                                        {activeTaskData.visual_data && activeTaskData.visual_data.length > 0 && (
                                            <div className="space-y-6 mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                {activeTaskData.visual_data.map((vd, idx) => (
                                                    <div key={idx} className="flex flex-col items-center gap-2">
                                                        <img
                                                            src={`${API_BASE}/api/cambridge-tests/image/${bookNum}/${vd.src}`}
                                                            alt={vd.title}
                                                            className="max-w-full max-h-[400px] object-contain rounded-lg shadow-sm bg-white"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                                                            }}
                                                        />
                                                        {vd.title && <p className="text-xs font-semibold text-gray-500 text-center">{vd.title}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Task 2 Essay Prompt */}
                                        {activeTaskData.prompt && (
                                            <div className="p-5 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                                                <p className="text-base text-gray-800 font-medium italic">"{activeTaskData.prompt}"</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Exam conditions reminder */}
                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-800">
                                <p className="font-semibold mb-1 flex items-center"><AlertTriangle className="h-3 w-3 mr-1.5" /> Exam considerations</p>
                                <ul className="list-disc list-inside space-y-1 text-xs leading-relaxed ml-1 opacity-90">
                                    <li>Stay highly objective for Task 1; do not include personal opinions.</li>
                                    <li>Provide clear supporting evidence and examples for Task 2.</li>
                                    <li>Avoid using abbreviations or bullet points. Write in full paragraphs.</li>
                                </ul>
                            </div>
                        </div>

                        {/* ── Right Side: Text Editor & Feedback ─── */}
                        <div className="flex flex-col gap-4">
                            <div className="bg-white border text-gray-800 border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                                {/* Editor Header */}
                                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                                    <label className="text-sm font-semibold text-gray-700">Your Response</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden shrink-0">
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${wordCount >= minWords ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-amber-400'}`}
                                                style={{ width: `${wordProgress}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-mono font-bold w-16 text-right ${wordCount >= minWords ? 'text-green-600' : 'text-amber-600'}`}>
                                            {wordCount} / {minWords}
                                        </span>
                                    </div>
                                </div>

                                <textarea
                                    value={essay}
                                    onChange={e => setEssays(s => ({ ...s, [activeTask]: e.target.value }))}
                                    placeholder={`Begin your ${activeTask === 1 ? 'data report' : 'essay argument'} here. Minimum ${minWords} words required.`}
                                    disabled={status === 'evaluating'}
                                    className="w-full flex-1 min-h-[350px] p-5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none resize-none transition-all disabled:bg-gray-50 font-sans leading-relaxed text-justify"
                                />

                                {/* Bottom Action Bar */}
                                <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
                                    {wordCount > 0 && wordCount < minWords ? (
                                        <p className="text-xs text-amber-600 font-semibold flex items-center gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            {minWords - wordCount} more words needed before submission.
                                        </p>
                                    ) : <div />}

                                    <button
                                        onClick={handleSubmit}
                                        disabled={status === 'evaluating' || !essay.trim() || wordCount < 50}
                                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white rounded-lg font-semibold transition-all shadow-md shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ml-auto"
                                    >
                                        {status === 'evaluating' ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" />Evaluating...</>
                                        ) : (
                                            <><Send className="w-4 h-4" />Submit & Evaluate</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Error */}
                            {status === 'error' && errorMsg && (
                                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3 shadow-sm">
                                    <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm">{errorMsg}</p>
                                </div>
                            )}

                            {/* Live Evaluation Box */}
                            {(status === 'evaluating' || status === 'done') && feedback && (
                                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col mt-2">
                                    <div className="flex overflow-x-auto custom-scrollbar">
                                        {CRITERIA_TABS.map((tab, i) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTabs(t => ({ ...t, [activeTask]: i }))}
                                                className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${activeTab === i
                                                    ? 'border-rose-500 text-rose-700 bg-rose-50'
                                                    : 'border-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>

                                    {status === 'evaluating' && (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-y border-amber-100 text-amber-700 text-xs font-medium uppercase tracking-wider">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />Gemma 3 analyzing text structure...
                                        </div>
                                    )}
                                    {status === 'done' && (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-y border-green-100 text-green-700 text-xs font-medium uppercase tracking-wider">
                                            <CheckCircle className="w-3.5 h-3.5" />Detailed Evaluation Ready
                                        </div>
                                    )}

                                    <div
                                        ref={feedbackRef}
                                        className="p-5 overflow-y-auto max-h-[500px] text-[13px] text-gray-700 leading-loose whitespace-pre-wrap font-sans custom-scrollbar bg-slate-50/50"
                                    >
                                        {feedback}
                                        {status === 'evaluating' && (
                                            <span className="inline-block w-2 h-3.5 bg-rose-400 animate-pulse rounded-sm ml-1 align-middle" />
                                        )}
                                    </div>

                                    {status === 'done' && (
                                        <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end">
                                            <button
                                                onClick={() => {
                                                    setEssays(s => ({ ...s, [activeTask]: '' }));
                                                    setFeedbacks(f => ({ ...f, [activeTask]: '' }));
                                                    setStatuses(st => ({ ...st, [activeTask]: 'ready' }));
                                                    setActiveTabs(t => ({ ...t, [activeTask]: 0 }));
                                                }}
                                                className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-rose-600 transition-colors px-3 py-1.5 rounded hover:bg-rose-50"
                                            >
                                                <RefreshCw className="h-3.5 w-3.5" /> Start completely over
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
