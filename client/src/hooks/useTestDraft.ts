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

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTestDraftOptions {
    skill: 'writing' | 'reading' | 'listening';
    setId: string;
    testNumber: number | string;
    totalSeconds: number;
}

interface DraftShape {
    answers: Record<string, string>;
    secondsLeft: number;
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
    const getInitialState = useCallback((): DraftShape => {
        try {
            const raw = sessionStorage.getItem(storageKey);
            if (raw) {
                const draft = JSON.parse(raw);

                // Backwards compatibility with old drafts that used startedAt
                if (draft.startedAt && draft.secondsLeft === undefined) {
                    const elapsed = Math.floor((Date.now() - draft.startedAt) / 1000);
                    const remaining = Math.max(totalSeconds - elapsed, 0);
                    return { answers: draft.answers || {}, secondsLeft: remaining };
                }

                return {
                    answers: draft.answers || {},
                    secondsLeft: draft.secondsLeft ?? totalSeconds
                };
            }
        } catch {
            // Corrupt sessionStorage — ignore and start fresh
            sessionStorage.removeItem(storageKey);
        }

        // No existing draft
        const newDraft: DraftShape = { answers: {}, secondsLeft: totalSeconds };
        sessionStorage.setItem(storageKey, JSON.stringify(newDraft));
        return newDraft;
    }, [storageKey, totalSeconds]);

    // Use a ref to prevent double-initialization in StrictMode
    const initializedRef = useRef(false);

    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
    const [timerExpired, setTimerExpired] = useState(false);

    // ── Handle storageKey changes (e.g. user navigates to next test) ─────────
    useEffect(() => {
        const initial = getInitialState();
        setAnswers(initial.answers);
        setSecondsLeft(initial.secondsLeft);
        setTimerExpired(initial.secondsLeft <= 0);
        initializedRef.current = true;
    }, [getInitialState]);

    // ── Persist answers and timer whenever they change ───────────────────────
    useEffect(() => {
        if (!initializedRef.current) return;

        try {
            sessionStorage.setItem(storageKey, JSON.stringify({
                answers,
                secondsLeft
            }));
        } catch {
            /* ignore storage errors */
        }
    }, [answers, secondsLeft, storageKey]);

    // ── Countdown timer ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!initializedRef.current) return;

        if (secondsLeft <= 0) {
            setTimerExpired(true);
            return;
        }

        // Reset expired state if secondsLeft somehow increases
        setTimerExpired(false);

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
    }, [storageKey, initializedRef.current]); // Re-run when storageKey or initialization changes

    // ── Clear draft (call on successful submit) ────────────────────────────────
    const clearDraft = useCallback(() => {
        sessionStorage.removeItem(storageKey);
    }, [storageKey]);

    return { answers, setAnswers, secondsLeft, timerExpired, clearDraft };
}
