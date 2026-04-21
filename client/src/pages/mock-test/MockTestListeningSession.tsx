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
import type { ListeningBook, ListeningTest, ListeningPart, SubSection, AnswerMap } from '@/types/questionTypes';

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_URL as string || 'http://localhost:5000/api').replace(/\/api$/, '');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatSetName(setId: string): string {
    return setId
        .replace(/^cambridge-/, 'Cambridge IELTS ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Builds the audio URL for a specific test + section.
 */
function buildAudioUrl(book: string, testNum: number, section: number): string {
    return `${API_BASE}/api/cambridge-tests/audio/${book}/T${testNum}S${section}.m4a`;
}

/**
 * Collects all sub-sections from a part, normalizing the different JSON shapes.
 */
function getSubSections(part: ListeningPart): SubSection[] {
    console.log('[MockTestListeningSession] getSubSections', { part: part.part, hasSub: !!part.sub_sections });

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
    const [answers, setAnswers] = useState<AnswerMap>({});
    const [timer, setTimer] = useState(2400); // 40 min countdown
    const [submitting, setSubmitting] = useState(false);
    const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);

    // Track total elapsed time for results display
    const startTimeRef = useRef(Date.now());

    // ── Fetch test data ───────────────────────────────────────────────────────
    useEffect(() => {
        console.log('[MockTestListeningSession] fetchTest called', { book, testNumber });
        setLoading(true);

        fetch(`${API_BASE}/api/cambridge-tests/listening/${book}`)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data: ListeningBook) => {
                console.log('[MockTestListeningSession] fetchTest success', { testCount: data.tests?.length });
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

    // ── Timer ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (gradeResult) return; // stop timer after submission
        const interval = setInterval(() => {
            setTimer(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [gradeResult]);

    const formatTimer = (s: number) =>
        `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    // ── Answer handler ────────────────────────────────────────────────────────
    const handleAnswer = (questionNumber: number | string, value: string) => {
        console.log('[MockTestListeningSession] handleAnswer', { questionNumber, value });
        setAnswers(prev => ({ ...prev, [String(questionNumber)]: value }));
    };

    // ── Submit & Grade ────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        console.log('[MockTestListeningSession] handleSubmit called', { answerCount: Object.keys(answers).length });
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
            console.log('[MockTestListeningSession] handleSubmit success', { bandScore: result.bandScore });
            setGradeResult(result);
        } catch (err) {
            console.error('[MockTestListeningSession] handleSubmit error', err);
            setError('Failed to grade your test. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Show results if graded ────────────────────────────────────────────────
    if (gradeResult) {
        const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
        return (
            <MockTestResults
                skill="Listening"
                setName={setName}
                testNumber={testNumber}
                gradeResult={gradeResult}
                timeSpent={timeSpent}
                onBack={() => navigate('/mock-test/listening')}
                onRetake={() => {
                    setGradeResult(null);
                    setAnswers({});
                    setTimer(2400);
                    setActivePart(1);
                    startTimeRef.current = Date.now();
                }}
            />
        );
    }

    // ── Current part data ─────────────────────────────────────────────────────
    const currentPart: ListeningPart | undefined = test?.parts.find(p => p.part === activePart);
    const subSections = currentPart ? getSubSections(currentPart) : [];
    const audioUrl = buildAudioUrl(book, testNumber, activePart);

    // ── Answered count per part ───────────────────────────────────────────────
    const getPartRange = (part: ListeningPart): [number, number] => {
        const range = part.questions_range.split('-').map(Number);
        return [range[0], range[1]];
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
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">{formatTimer(timer)}</span>
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
                                            Q {part.questions_range}
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
