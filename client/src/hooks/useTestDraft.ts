/**
 * useTestDraft.ts
 *
 * Custom hook that persists test answers and timer state to sessionStorage.
 * This ensures that if a student refreshes the page mid-test, their answers
 * and remaining time are fully restored — not lost.
 *
 * Storage key format: ielts_draft_{skill}_{setId}_{testNumber}
 * e.g.  ielts_draft_writing_cambridge-20_1
 *       ielts_draft_reading_cambridge-20_1
 *       ielts_draft_listening_cambridge-20_1
 *
 * Stored shape:
 *   { answers: Record<string, string>, startedAt: number (epoch ms) }
 *
 * Usage:
 *   const { answers, setAnswers, secondsLeft, clearDraft } = useTestDraft({
 *       skill: 'reading',
 *       setId: 'cambridge-20',
 *       testNumber: 1,
 *       totalSeconds: 3600,
 *   });
 */

import { useState, useEffect, useCallback } from 'react';

interface UseTestDraftOptions {
    skill: 'writing' | 'reading' | 'listening';
    setId: string;
    testNumber: number | string;
    totalSeconds: number;
}

interface DraftShape {
    answers: Record<string, string>;
    startedAt: number; // Date.now() when the test was first started
}

interface UseTestDraftReturn {
    answers: Record<string, string>;
    setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    secondsLeft: number;
    timerExpired: boolean;
    clearDraft: () => void;
}

export function useTestDraft({
    skill,
    setId,
    testNumber,
    totalSeconds,
}: UseTestDraftOptions): UseTestDraftReturn {
    const storageKey = `ielts_draft_${skill}_${setId}_${testNumber}`;

    // ── Restore or initialize draft ────────────────────────────────────────────
    const getInitialState = (): { answers: Record<string, string>; secondsLeft: number } => {
        try {
            const raw = sessionStorage.getItem(storageKey);
            if (raw) {
                const draft: DraftShape = JSON.parse(raw);
                // Compute remaining seconds based on real elapsed wall-clock time
                const elapsed = Math.floor((Date.now() - draft.startedAt) / 1000);
                const remaining = Math.max(totalSeconds - elapsed, 0);
                console.log(`[useTestDraft] Restored draft for ${storageKey}`, {
                    answerCount: Object.keys(draft.answers).length,
                    secondsLeft: remaining,
                });
                return { answers: draft.answers, secondsLeft: remaining };
            }
        } catch {
            // Corrupt sessionStorage — ignore and start fresh
            sessionStorage.removeItem(storageKey);
        }

        // No existing draft — record start time now
        const newDraft: DraftShape = { answers: {}, startedAt: Date.now() };
        sessionStorage.setItem(storageKey, JSON.stringify(newDraft));
        console.log(`[useTestDraft] New draft started for ${storageKey}`);
        return { answers: {}, secondsLeft: totalSeconds };
    };

    const initial = getInitialState();
    const [answers, setAnswers] = useState<Record<string, string>>(initial.answers);
    const [secondsLeft, setSecondsLeft] = useState(initial.secondsLeft);
    const [timerExpired, setTimerExpired] = useState(initial.secondsLeft <= 0);



    // ── Persist answers whenever they change ───────────────────────────────────
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(storageKey);
            const existing: DraftShape = raw ? JSON.parse(raw) : { startedAt: Date.now() };
            sessionStorage.setItem(storageKey, JSON.stringify({
                startedAt: existing.startedAt,
                answers,
            }));
        } catch {
            /* ignore storage errors */
        }
    }, [answers, storageKey]);

    // ── Countdown timer ────────────────────────────────────────────────────────
    useEffect(() => {
        if (secondsLeft <= 0) {
            setTimerExpired(true);
            return;
        }

        const interval = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setTimerExpired(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []); // Only run once — secondsLeft is restored from storage

    // ── Clear draft (call on successful submit) ────────────────────────────────
    const clearDraft = useCallback(() => {
        sessionStorage.removeItem(storageKey);
        console.log(`[useTestDraft] Draft cleared for ${storageKey}`);
    }, [storageKey]);

    return { answers, setAnswers, secondsLeft, timerExpired, clearDraft };
}
