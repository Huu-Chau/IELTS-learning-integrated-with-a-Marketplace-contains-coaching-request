/**
 * MockTestReadingSession.tsx
 *
 * Mock Test > Reading session page.
 * Reached via: /mock-test/reading/session?setId=cambridge-20&test=1
 *
 * Layout:
 *  - Top bar: back button, test title, timer, submit
 *  - Passage tabs (Passage 1 / 2 / 3)
 *  - Full-height two-pane split:
 *      LEFT  (55%): passage title + paragraph text (labelled A, B, C…)
 *      RIGHT (45%): progress dots + question section cards
 *  Both panes scroll independently.
 *
 *  On submit → POST /grade → show MockTestResults overlay.
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, Loader2, Clock, AlertCircle, Send } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { QuestionSectionCard } from '@/components/practice/questions';
import MockTestResults, { GradeResult } from './MockTestResults';
import type { ReadingBook, ReadingTest, ReadingPassage, AnswerMap } from '@/types/questionTypes';

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_URL as string || 'http://localhost:5000/api').replace(/\/api$/, '');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatSetName(setId: string): string {
    return setId
        .replace(/^cambridge-/, 'Cambridge IELTS ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

/** Derive the question range for a passage by scanning sub_sections + questions. */
function derivePassageRange(passage: ReadingPassage): string {
    const allNums: number[] = [];
    (passage.sub_sections ?? []).forEach(sec => {
        if (sec.questions_range) {
            const parts = sec.questions_range.split('-').map(Number);
            if (!isNaN(parts[0])) allNums.push(parts[0]);
            if (!isNaN(parts[1])) allNums.push(parts[1]);
        }
        (sec.questions ?? []).forEach(q => {
            if (q.question_number) allNums.push(q.question_number);
        });
    });
    if (allNums.length === 0) return '?–?';
    return `${Math.min(...allNums)}–${Math.max(...allNums)}`;
}

/**
 * Normalise passage_text: JSON may store it as either a string or string[].
 * - string  → split by double-newlines into paragraph array
 * - string[] → pass through unchanged
 */
function normalizePassageText(raw: string | string[] | undefined): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    // Split on two or more newlines to get individual paragraphs
    return raw
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MockTestReadingSession() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    console.log('[MockTestReadingSession] render called');

    const setId = searchParams.get('setId') ?? 'cambridge-20';
    const testNumber = parseInt(searchParams.get('test') ?? '1', 10);
    const setName = formatSetName(setId);

    const bookMatch = setId.match(/cambridge-?(\d+)/i);
    const book = bookMatch ? bookMatch[1] : '20';

    const [test, setTest] = useState<ReadingTest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activePassage, setActivePassage] = useState(1);
    const [answers, setAnswers] = useState<AnswerMap>({});
    const [timer, setTimer] = useState(3600); // 60 min
    const [submitting, setSubmitting] = useState(false);
    const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);

    // Track total elapsed time for results display
    const startTimeRef = useRef(Date.now());

    // ── Fetch ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        console.log('[MockTestReadingSession] fetchTest called', { book, testNumber });
        setLoading(true);
        setTest(null);
        setError(null);

        fetch(`${API_BASE}/api/cambridge-tests/reading/${book}`)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data: ReadingBook) => {
                console.log('[MockTestReadingSession] fetchTest success', { testCount: data.tests?.length });
                const found = data.tests.find(t => t.test_number === testNumber);
                if (found) setTest(found);
                else setError(`Test ${testNumber} not found.`);
            })
            .catch(err => {
                console.error('[MockTestReadingSession] fetchTest error', err);
                setError('Failed to load reading test data.');
            })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setId, testNumber]);

    // ── Timer ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (gradeResult) return; // stop timer after submission
        const interval = setInterval(() => setTimer(p => Math.max(0, p - 1)), 1000);
        return () => clearInterval(interval);
    }, [gradeResult]);

    const formatTimer = (s: number) =>
        `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    // ── Answer handler ────────────────────────────────────────────────────────
    const handleAnswer = (questionNumber: number, value: string) => {
        console.log('[MockTestReadingSession] handleAnswer', { questionNumber, value });
        setAnswers(prev => ({ ...prev, [String(questionNumber)]: value }));
    };

    // ── Submit & Grade ────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        console.log('[MockTestReadingSession] handleSubmit called', { answerCount: Object.keys(answers).length });
        setSubmitting(true);

        try {
            const response = await fetch(`${API_BASE}/api/cambridge-tests/grade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    skill: 'reading',
                    book,
                    testNumber,
                    answers,
                }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result: GradeResult = await response.json();
            console.log('[MockTestReadingSession] handleSubmit success', { bandScore: result.bandScore });
            setGradeResult(result);
        } catch (err) {
            console.error('[MockTestReadingSession] handleSubmit error', err);
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
                skill="Reading"
                setName={setName}
                testNumber={testNumber}
                gradeResult={gradeResult}
                timeSpent={timeSpent}
                onBack={() => navigate('/mock-test/reading')}
                onRetake={() => {
                    setGradeResult(null);
                    setAnswers({});
                    setTimer(3600);
                    setActivePassage(1);
                    startTimeRef.current = Date.now();
                }}
            />
        );
    }

    // ── Derived per-passage data ──────────────────────────────────────────────
    const currentPassage: ReadingPassage | undefined =
        (test?.passages ?? []).find(p => p.passage_number === activePassage);

    const getAnsweredCount = (passage: ReadingPassage): number => {
        let count = 0;
        (passage.sub_sections ?? []).forEach(sec =>
            (sec.questions ?? []).forEach(q => {
                if (answers[String(q.question_number)]) count++;
            })
        );
        return count;
    };

    const getTotalQuestions = (passage: ReadingPassage): number => {
        let total = 0;
        (passage.sub_sections ?? []).forEach(sec => {
            total += (sec.questions ?? []).length;
        });
        return total;
    };

    const getAllQuestionNumbers = (passage: ReadingPassage): number[] => {
        const nums: number[] = [];
        (passage.sub_sections ?? []).forEach(sec =>
            (sec.questions ?? []).forEach(q => nums.push(q.question_number))
        );
        return nums.sort((a, b) => a - b);
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <DashboardLayout role="student">
            <div className="flex flex-col bg-gray-50 -m-4 lg:-m-8 min-h-screen">

                {/* ── Topbar ── */}
                <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-gray-200 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/mock-test/reading')}
                            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-700">
                                {setName} — Test {testNumber}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full
                            ${timer < 300 ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-100'}`}>
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">{formatTimer(timer)}</span>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 transition-colors px-3 py-1.5 rounded-full shadow-sm"
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

                {/* ── Loading / Error ── */}
                {loading && (
                    <div className="flex-1 flex justify-center items-center">
                        <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
                    </div>
                )}
                {error && (
                    <div className="m-6 bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                {test && (
                    <div className="flex flex-col">
                        {/* ── Passage tabs ── */}
                        <div className="flex bg-white border-b border-gray-200 px-6 sticky top-0 z-10">
                            {(test.passages ?? []).map(passage => {
                                const isActive = passage.passage_number === activePassage;
                                const answered = getAnsweredCount(passage);
                                const total = getTotalQuestions(passage);
                                const range = derivePassageRange(passage);
                                return (
                                    <button
                                        key={passage.passage_number}
                                        onClick={() => setActivePassage(passage.passage_number)}
                                        className={`py-3 px-5 text-sm font-semibold transition-all border-b-2 whitespace-nowrap
                                            ${isActive
                                                ? 'text-gray-900 border-gray-900'
                                                : 'text-gray-400 border-transparent hover:text-gray-600'
                                            }`}
                                    >
                                        Passage {passage.passage_number}
                                        <span className="ml-2 text-[10px] text-gray-400">
                                            Q {range}
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

                        {/* ── Split pane ── */}
                        {currentPassage && (
                            <div className="grid grid-cols-[55%_45%] divide-x divide-gray-200">

                                {/* ── LEFT — Passage text (sticky while scrolling) ── */}
                                <div className="bg-white">
                                    <div className="px-8 py-6 max-w-3xl">
                                        {/* Passage heading */}
                                        <div className="mb-6">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                                                Passage {currentPassage.passage_number}
                                            </p>
                                            <h2 className="text-xl font-bold text-gray-900 leading-snug">
                                                {currentPassage.title}
                                            </h2>
                                            {currentPassage.subtitle && (
                                                <p className="text-sm text-gray-500 italic mt-1 leading-relaxed">
                                                    {currentPassage.subtitle}
                                                </p>
                                            )}
                                        </div>

                                        {/* Paragraphs */}
                                        {(() => {
                                            const paragraphs = normalizePassageText(
                                                currentPassage.passage_text as string | string[] | undefined
                                            );
                                            return paragraphs.length > 0 ? (
                                                <div className="space-y-4">
                                                    {paragraphs.map((para, idx) => (
                                                        <div key={idx} className="flex gap-3">
                                                            <span className="shrink-0 w-5 h-5 mt-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center">
                                                                {String.fromCharCode(65 + idx)}
                                                            </span>
                                                            <p className="text-sm text-gray-700 leading-7 text-justify">
                                                                {para}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-10 text-center text-gray-400">
                                                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                                    <p className="text-sm italic">Passage text not available.</p>
                                                    <p className="text-xs mt-1 text-gray-300">Refer to your physical book for this passage.</p>
                                                </div>
                                            );
                                        })()}

                                    </div>
                                </div>

                                {/* ── RIGHT — Questions ── */}
                                <div className="bg-gray-50">
                                    <div className="px-5 py-5 space-y-4">

                                        {/* Progress tracker */}
                                        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                                            <div className="flex items-center justify-between mb-2.5">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                    Progress
                                                </span>
                                                <span className="text-xs font-semibold text-gray-500">
                                                    {getAnsweredCount(currentPassage)}/{getTotalQuestions(currentPassage)} answered
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {getAllQuestionNumbers(currentPassage).map(qn => {
                                                    const filled = !!answers[String(qn)];
                                                    return (
                                                        <div
                                                            key={qn}
                                                            className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors
                                                                ${filled
                                                                    ? 'bg-gray-900 text-white'
                                                                    : 'bg-gray-100 text-gray-400'
                                                                }`}
                                                        >
                                                            {qn}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Question section cards */}
                                        <div className="space-y-0">
                                            {(currentPassage.sub_sections ?? []).map((sec, idx) => (
                                                <QuestionSectionCard
                                                    key={`${activePassage}-${idx}`}
                                                    subSection={sec}
                                                    answers={answers}
                                                    onAnswer={handleAnswer}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── No data placeholder ── */}
                {!loading && !test && !error && (
                    <div className="flex flex-col items-center justify-center gap-3 text-center py-20">
                        <BookOpen className="h-10 w-10 text-gray-300" />
                        <p className="font-semibold text-gray-600">No test data available</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
