import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, PlayCircle, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';

// simple className joiner (avoids needing @/lib/utils)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MockTestEntry {
    testNumber: number;              // 1 | 2 | 3 | 4
    completedAt?: string;            // ISO date string if completed
    score?: number;                  // Band score (e.g. 7.0)
    sessionPath?: string;            // Where to navigate to start this test
}

export interface MockTestSet {
    id: string;                      // e.g. 'cambridge-20'
    name: string;                    // e.g. 'Cambridge IELTS 20'
    tests: MockTestEntry[];          // Always 4 entries
}

interface MockTestSkillListProps {
    skill: 'Reading' | 'Listening' | 'Writing' | 'Speaking';
    accentColor: 'violet' | 'emerald' | 'rose' | 'amber' | 'indigo';
    /** Route prefix for the session page, e.g. /mock-test/reading/session */
    sessionPrefix: string;
    testSets: MockTestSet[];
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

const COLORS: Record<string, { badge: string; btn: string; cover: string; progress: string; ring: string }> = {
    violet: { badge: 'bg-violet-100 text-violet-700', btn: 'bg-violet-600 hover:bg-violet-700 text-white', cover: 'from-violet-800 to-violet-950', progress: 'bg-violet-500', ring: 'ring-violet-200' },
    emerald: { badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700 text-white', cover: 'from-emerald-700 to-emerald-950', progress: 'bg-emerald-500', ring: 'ring-emerald-200' },
    rose: { badge: 'bg-rose-100 text-rose-700', btn: 'bg-rose-600 hover:bg-rose-700 text-white', cover: 'from-rose-700 to-rose-950', progress: 'bg-rose-500', ring: 'ring-rose-200' },
    amber: { badge: 'bg-amber-100 text-amber-700', btn: 'bg-amber-500 hover:bg-amber-600 text-white', cover: 'from-amber-700 to-amber-950', progress: 'bg-amber-500', ring: 'ring-amber-200' },
    indigo: { badge: 'bg-indigo-100 text-indigo-700', btn: 'bg-indigo-600 hover:bg-indigo-700 text-white', cover: 'from-indigo-700 to-indigo-950', progress: 'bg-indigo-500', ring: 'ring-indigo-200' },
};

// ─── TestCard ─────────────────────────────────────────────────────────────────

function TestCard({
    skill,
    setName,
    entry,
    accentColor,
    onStart,
    onReview,
}: {
    skill: string;
    setName: string;
    entry: MockTestEntry;
    accentColor: string;
    onStart: () => void;
    onReview: () => void;
}) {
    const c = COLORS[accentColor];
    const done = Boolean(entry.completedAt);

    // Derive a short set number from the set name, e.g. "Cambridge IELTS 20" → "20"
    const setNum = setName.match(/\d+$/)?.[0] ?? '';

    return (
        <div className={cn(
            'bg-white rounded-2xl border overflow-hidden transition-all duration-200',
            done ? 'border-gray-200' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
        )}>
            {/* Cover thumbnail */}
            <div className={cn('h-28 bg-gradient-to-br flex flex-col items-center justify-center relative select-none', c.cover)}>
                <span className="absolute top-2 left-2 text-[10px] font-bold text-white/60 uppercase tracking-widest">IELTS Academic</span>
                {done && entry.score && (
                    <span className="absolute top-2 right-2 bg-green-400 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                        {entry.score.toFixed(1)}
                    </span>
                )}
                <span className="text-white/30 font-black text-6xl leading-none">{setNum}</span>
                <span className="text-white text-[11px] font-semibold tracking-wide mt-0.5">Test {entry.testNumber}</span>
            </div>

            {/* Body */}
            <div className="p-4">
                <p className="text-sm font-semibold text-gray-800 mb-1">
                    {skill} — Test {entry.testNumber}
                </p>

                {done && (
                    <p className="text-xs text-gray-400 mb-3">
                        Last attempt: {new Date(entry.completedAt!).toLocaleDateString('en-GB')}
                    </p>
                )}
                {!done && <div className="mb-3" />}

                {/* Status + actions row */}
                <div className="flex items-center justify-end gap-2">
                    <div className="flex gap-2">
                        {done && (
                            <button
                                onClick={onReview}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                <Eye className="h-3 w-3 inline mr-1" />Review
                            </button>
                        )}
                        <button
                            onClick={onStart}
                            className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1', c.btn)}
                        >
                            <PlayCircle className="h-3 w-3" />
                            {done ? 'Retake' : 'Start'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── TestSetGroup ─────────────────────────────────────────────────────────────

function TestSetGroup({
    set,
    skill,
    accentColor,
    sessionPrefix,
}: {
    set: MockTestSet;
    skill: string;
    accentColor: string;
    sessionPrefix: string;
}) {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const c = COLORS[accentColor];

    const completed = set.tests.filter(t => t.completedAt).length;
    const total = set.tests.length;
    const pct = Math.round((completed / total) * 100);

    const handleStart = (entry: MockTestEntry) => {
        const path = entry.sessionPath ?? `${sessionPrefix}?setId=${set.id}&test=${entry.testNumber}`;
        navigate(path);
    };

    return (
        <div className="mb-8">
            {/* Group header */}
            <div
                className="flex items-center justify-between mb-3 cursor-pointer select-none"
                onClick={() => setCollapsed(p => !p)}
            >
                <div className="flex items-center gap-2">
                    {collapsed ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
                    <h2 className="text-base font-bold text-gray-800">{set.name}</h2>
                </div>
            </div>

            {/* Cards */}
            {!collapsed && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {set.tests.map(entry => (
                        <TestCard
                            key={entry.testNumber}
                            skill={skill}
                            setName={set.name}
                            entry={entry}
                            accentColor={accentColor}
                            onStart={() => handleStart(entry)}
                            onReview={() => handleStart(entry)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function MockTestSkillList({
    skill,
    accentColor,
    sessionPrefix,
    testSets,
}: MockTestSkillListProps) {
    const navigate = useNavigate();

    // specific layout for Speaking mock test
    const speakingTests = testSets
        .filter(set => set.id !== 'cambridge-0')
        .sort((a, b) => {
            const numA = parseInt(a.id.match(/\d+/)?.[0] || '0');
            const numB = parseInt(b.id.match(/\d+/)?.[0] || '0');
            return numB - numA;
        })
        .slice(0, 4)
        .map(set => {
            const num = parseInt(set.id.match(/\d+/)?.[0] || '0');
            return {
                testNumber: num,
                sessionPath: set.tests[0]?.sessionPath || `${sessionPrefix}?setId=${set.id}&test=1`,
                completedAt: set.tests.find(t => t.completedAt)?.completedAt,
                score: set.tests.find(t => t.score)?.score
            };
        });

    return (
        <DashboardLayout role="student">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <span className={cn('text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-2 inline-block', COLORS[accentColor].badge)}>
                        Mock Test
                    </span>
                    <h1 className="text-2xl font-bold text-gray-800">{skill}</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Select a test set and start an exam-style session under timed conditions.
                    </p>
                </div>

                {testSets.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <p className="text-sm">No test materials yet. Check back soon.</p>
                    </div>
                ) : skill === 'Speaking' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {speakingTests.map(entry => {
                            const c = COLORS[accentColor];
                            const done = Boolean(entry.completedAt);
                            
                            return (
                                <div key={entry.testNumber} className={cn(
                                    'bg-white rounded-2xl border overflow-hidden transition-all duration-200',
                                    done ? 'border-gray-200' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                                )}>
                                    <div className={cn('h-28 bg-gradient-to-br flex flex-col items-center justify-center relative select-none', c.cover)}>
                                        <span className="absolute top-2 left-2 text-[10px] font-bold text-white/60 uppercase tracking-widest">IELTS Academic</span>
                                        {done && entry.score && (
                                            <span className="absolute top-2 right-2 bg-green-400 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                                                {entry.score.toFixed(1)}
                                            </span>
                                        )}
                                        <span className="text-white/30 font-black text-6xl leading-none">{entry.testNumber}</span>
                                        <span className="text-white text-[11px] font-semibold tracking-wide mt-0.5">Test</span>
                                    </div>

                                    <div className="p-4">
                                        <p className="text-sm font-semibold text-gray-800 mb-1">
                                            {skill} — Test {entry.testNumber}
                                        </p>

                                        {done && (
                                            <p className="text-xs text-gray-400 mb-3">
                                                Last attempt: {new Date(entry.completedAt!).toLocaleDateString('en-GB')}
                                            </p>
                                        )}
                                        {!done && <div className="mb-3" />}

                                        <div className="flex items-center justify-end gap-2">
                                            <div className="flex gap-2">
                                                {done && (
                                                    <button
                                                        onClick={() => navigate(entry.sessionPath)}
                                                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <Eye className="h-3 w-3 inline mr-1" />Review
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => navigate(entry.sessionPath)}
                                                    className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1', c.btn)}
                                                >
                                                    <PlayCircle className="h-3 w-3" />
                                                    {done ? 'Retake' : 'Start'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    testSets.map(set => (
                        <TestSetGroup
                            key={set.id}
                            set={set}
                            skill={skill}
                            accentColor={accentColor}
                            sessionPrefix={sessionPrefix}
                        />
                    ))
                )}
            </div>
        </DashboardLayout>
    );
}
