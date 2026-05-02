/**
 * MockTestListeningSession.tsx
 *
 * Mock Test > Listening session page.
 * Reached via: /mock-test/listening/session?setId=cambridge-20&test=1
 *
 * Owns its own DashboardLayout (NOT a re-export wrapper) to prevent the
 * double-sidebar recursion bug.
 *
 * Monochrome (black/gray/white) design.
 * Fetches full test JSON from /api/cambridge-tests/listening/:book,
 * plays audio per-section from /api/cambridge-tests/audio/:book/TxSy.m4a,
 * and renders question components via QuestionSectionCard.
 *
 * On submit → POST /grade → show MockTestResults overlay.
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Headphones, ArrowLeft, Loader2, Clock, Send } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import AudioPlayer from '@/components/practice/AudioPlayer';
import { QuestionSectionCard } from '@/components/practice/questions';
import MockTestResults, { GradeResult } from './MockTestResults';
import type { ListeningBook, ListeningTest, ListeningPart, SubSection } from '@/types/questionTypes';
import { useTestDraft } from '@/hooks/useTestDraft';
import { useAuth } from '@/context/AuthContext';

// ─── Utility ──────────────────────────────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_URL as string || 'http://localhost:5000/api').replace(/\/api$/, '');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatSetName(setId: string): string {
    return setId
        .replace(/^cambridge-/, 'Cambridge IELTS ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function getSubSections(part: ListeningPart): SubSection[] {
    if (part.sub_sections && part.sub_sections.length > 0) {
        return part.sub_sections;
    }

    if (part.questions && part.questions.length > 0) {
        return [{
            questions_range: part.questions_range,
            instructions: part.instructions ?? '',
            content: part.content,
            questions: part.questions,
        }];
    }

    return [];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MockTestListeningSession() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, getIdToken } = useAuth();

    const setId = searchParams.get('setId') ?? 'cambridge-20';
    const testNumber = parseInt(searchParams.get('test') ?? '1', 10);
    const setName = formatSetName(setId);

    // Extract book number from "cambridge-20"
    const bookMatch = setId.match(/cambridge-?(\d+)/i);
    const book = bookMatch ? bookMatch[1] : '20';

    const [test, setTest] = useState<ListeningTest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activePart, setActivePart] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);

    // ── Draft persistence: answers + timer survive page refresh ───────────────
    const { answers, setAnswers, secondsLeft, timerExpired, clearDraft } = useTestDraft({
        skill: 'listening',
        setId,
        testNumber,
        totalSeconds: 2400, // 40 min
    });

    // Track total elapsed time — frozen at submission
    const startTimeRef = useRef(Date.now());
    const [timeSpent, setTimeSpent] = useState(0);

    // ── Fetch test data ───────────────────────────────────────────────────────
    useEffect(() => {
        setLoading(true);

        fetch(`${API_BASE}/api/cambridge-tests/listening/${book}`)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data: ListeningBook) => {
                const found = data.tests.find(t => t.test_number === testNumber);
                if (found) {
                    setTest(found);
                } else {
                    setError(`Test ${testNumber} not found in ${data.book}`);
                }
            })
            .catch(err => {
                console.error('[MockTestListeningSession] fetchTest error', err);
                setError('Failed to load listening test data.');
            })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setId, testNumber]);

    // Timer is managed by useTestDraft hook (secondsLeft)
    useEffect(() => {
        if (timerExpired && !submitting && !gradeResult && test) {
            console.log('[MockTestListeningSession] Timer expired — auto-submitting');
            handleSubmit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timerExpired]);

    const formatTimer = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    // ── Answer handler ────────────────────────────────────────────────────────
    const handleAnswer = (questionNumber: number | string, value: string) => {
        setAnswers(prev => ({ ...prev, [String(questionNumber)]: value }));
    };

    // ── Submit & Grade ────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        setSubmitting(true);

        try {
            const response = await fetch(`${API_BASE}/api/cambridge-tests/grade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    skill: 'listening',
                    book,
                    testNumber,
                    answers,
                }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result: GradeResult = await response.json();
            clearDraft(); // ── Wipe saved draft on successful submit
            setTimeSpent(Math.round((Date.now() - startTimeRef.current) / 1000));
            setGradeResult(result);

            if (user && getIdToken) {
                const token = await getIdToken();
                await fetch(`${API_BASE}/api/attempts`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        type: 'listening',
                        testId: `listening-${setId}-${testNumber}`,
                        score: result.bandScore,
                        answers: answers,
                        feedback: `Completed Listening Test ${testNumber} from ${setName}.`
                    })
                }).catch(e => console.error('[MockTestListeningSession] Failed to save attempt', e));
            }
        } catch (err) {
            console.error('[MockTestListeningSession] handleSubmit error', err);
            setError('Failed to grade your test. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Show results if graded ────────────────────────────────────────────────
    if (gradeResult) {
        return (
            <MockTestResults
                skill="Listening"
                setName={setName}
                testNumber={testNumber}
                gradeResult={gradeResult}
                timeSpent={timeSpent}
                onBack={() => navigate('/mock-test/listening')}
                onRetake={() => {
                    clearDraft();
                    setGradeResult(null);
                    setAnswers({});
                    setActivePart(1);
                    startTimeRef.current = Date.now();
                }}
            />
        );
    }

    // ── Current part data ─────────────────────────────────────────────────────
    const currentPart: ListeningPart | undefined = test?.parts.find(p => p.part === activePart);
    const subSections = currentPart ? getSubSections(currentPart) : [];

    // Read the exact MinIO path from the JSON and pass it to the backend streaming route
    const audioUrl = currentPart?.audio_key
        ? `${API_BASE}/api/cambridge-tests/stream?key=${encodeURIComponent(currentPart.audio_key)}`
        : '';

    // ── Answered count per part ───────────────────────────────────────────────
    const getPartRange = (part: ListeningPart): [number, number] => {
        const start = (part.part - 1) * 10 + 1;
        return [start, start + 9];
    };

    const getAnsweredCount = (part: ListeningPart): number => {
        const [start, end] = getPartRange(part);
        let count = 0;
        for (let i = start; i <= end; i++) {
            if (answers[String(i)]) count++;
        }
        return count;
    };

    const getTotalQuestions = (part: ListeningPart): number => {
        const [start, end] = getPartRange(part);
        return end - start + 1;
    };

    return (
        <DashboardLayout role="student">
            <div className="max-w-4xl mx-auto space-y-5 pb-12 pt-4">

                {/* ── Topbar / Header ── */}
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/mock-test/listening')}
                            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 hover:-translate-x-1 transition-all font-medium"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back to Listening tests
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                                <Headphones className="h-5 w-5 text-gray-500" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    {setName} — Test {testNumber}
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full
                            ${secondsLeft < 300 ? 'text-red-600 bg-red-50' : secondsLeft < 600 ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-100'}`}>
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">{formatTimer(secondsLeft)}</span>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 transition-colors px-4 py-2 rounded-full shadow-sm"
                        >
                            {submitting ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Send className="h-3 w-3" />
                            )}
                            {submitting ? 'Grading...' : 'Submit Test'}
                        </button>
                    </div>
                </div>

                {/* ── Loading ── */}
                {loading && (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
                    </div>
                )}

                {/* ── Error ── */}
                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100">
                        {error}
                    </div>
                )}

                {/* ── Test content ── */}
                {test && (
                    <>
                        {/* ── Part tabs ── */}
                        <div className="flex gap-0 bg-white border border-gray-200 rounded-xl overflow-hidden mt-6">
                            {test.parts.map(part => {
                                const isActive = part.part === activePart;
                                const answered = getAnsweredCount(part);
                                const total = getTotalQuestions(part);
                                return (
                                    <button
                                        key={part.part}
                                        onClick={() => setActivePart(part.part)}
                                        className={`flex-1 py-3 px-4 text-sm font-semibold transition-all border-b-2
                                            ${isActive
                                                ? 'text-gray-900 border-gray-900 bg-gray-50'
                                                : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50/50'
                                            }`}
                                    >
                                        <span>Part {part.part}</span>
                                        <span className="ml-2 text-[10px] text-gray-400">
                                            Q {(part.part - 1) * 10 + 1}-{part.part * 10}
                                        </span>
                                        {answered > 0 && (
                                            <span className="ml-1.5 text-[10px] bg-gray-900 text-white rounded-full px-1.5 py-0.5">
                                                {answered}/{total}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* ── Audio player ── */}
                        <AudioPlayer
                            src={audioUrl}
                            title={`Part ${activePart} · Section ${activePart}`}
                        />

                        {/* ── Question number grid ── */}
                        {currentPart && (
                            <div className="flex items-center gap-2 flex-wrap bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                                <span className="text-xs font-semibold text-gray-400 mr-2">
                                    Progress:
                                </span>
                                {(() => {
                                    const [start, end] = getPartRange(currentPart);
                                    const dots = [];
                                    for (let i = start; i <= end; i++) {
                                        const filled = !!answers[String(i)];
                                        dots.push(
                                            <div
                                                key={i}
                                                className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors shadow-sm
                                                    ${filled
                                                        ? 'bg-gray-900 text-white'
                                                        : 'bg-white text-gray-400 border border-gray-200'
                                                    }`}
                                            >
                                                {i}
                                            </div>
                                        );
                                    }
                                    return dots;
                                })()}
                            </div>
                        )}

                        {/* ── Question sections ── */}
                        <div className="space-y-0">
                            {subSections.map((sec, idx) => (
                                <QuestionSectionCard
                                    key={`${activePart}-${idx}`}
                                    subSection={sec}
                                    answers={answers}
                                    onAnswer={handleAnswer}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* ── No data placeholder ── */}
                {!loading && !test && !error && (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 flex flex-col items-center text-center gap-3">
                        <Headphones className="h-10 w-10 text-gray-300" />
                        <p className="font-semibold text-gray-600">No test data available</p>
                        <p className="text-sm text-gray-400 max-w-sm">
                            The listening test could not be loaded. Please check that test data exists.
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}