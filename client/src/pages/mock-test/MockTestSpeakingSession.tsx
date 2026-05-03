/**
 * MockTestSpeakingSession.tsx
 *
 * Full IELTS Speaking Mock Test session powered by the Socket.io Speaking Examiner.
 * Connects to the backend `speakingSessionController` which handles:
 *   - AI examiner dialogue via Ollama (gemma3:4b)
 *   - STT (Whisper) for transcribing student responses
 *   - TTS (edge-tts) for AI examiner voice
 *   - Band score evaluation at the end
 *
 * Accessed from /mock-test/speaking/session?setId=...&test=...
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import {
    Mic,
    MicOff,
    Square,
    Volume2,
    VolumeX,
    Loader2,
    CheckCircle,
    AlertCircle,
    ChevronLeft,
    Radio,
    ExternalLink,
    Save,
    Clock,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type SessionPhase = 'connecting' | 'ready' | 'recording' | 'processing' | 'evaluating' | 'done' | 'error';

interface TranscriptEntry {
    id: string;
    speaker: 'user' | 'ai';
    text: string;
    timestamp: Date;
}

interface TopicInfo {
    part1?: string;
    part2?: string;
    part3?: string;
}

interface SavedAttemptInfo {
    attemptId: number;
    bandScore: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const MIME_TYPE = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

// ─── Component ───────────────────────────────────────────────────────────────

export default function MockTestSpeakingSession() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Session state
    const [phase, setPhase] = useState<SessionPhase>('connecting');
    const [statusText, setStatusText] = useState('Connecting to examiner…');
    const [topicInfo, setTopicInfo] = useState<TopicInfo>({});
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [evaluation, setEvaluation] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [savedAttempt, setSavedAttempt] = useState<SavedAttemptInfo | null>(null);

    // ─── Session Timer (14 min = 840 seconds, standard IELTS speaking duration)
    const SPEAKING_TOTAL_SECONDS = 14 * 60;
    const [sessionTimer, setSessionTimer] = useState(SPEAKING_TOTAL_SECONDS);

    // Refs
    const socketRef = useRef<Socket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioQueueRef = useRef<ArrayBuffer[]>([]);
    const isPlayingRef = useRef(false);
    const transcriptEndRef = useRef<HTMLDivElement | null>(null);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const setId = searchParams.get('setId') ?? '';
    const testNum = searchParams.get('test') ?? '1';

    // ── Auto-scroll transcript ─────────────────────────────────────────────
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    // ── Session countdown timer (starts when ready, stops on done/error) ───
    useEffect(() => {
        if (phase === 'connecting' || phase === 'done' || phase === 'error' || phase === 'evaluating') return;
        const interval = setInterval(() => {
            setSessionTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [phase]);

    // ── Auto-submit when session timer hits zero ──────────────────────────
    useEffect(() => {
        if (sessionTimer === 0 && phase !== 'done' && phase !== 'evaluating' && phase !== 'error' && phase !== 'connecting') {
            console.log('[MockTestSpeakingSession] Timer expired — auto-submitting');
            stopRecording();
            socketRef.current?.emit('speaking:end');
            setPhase('evaluating');
            setStatusText('Time\'s up! Evaluating your performance…');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionTimer]);

    // ── Audio playback queue ───────────────────────────────────────────────
    const playNextInQueue = useCallback(async () => {
        if (isPlayingRef.current) return;

        if (audioQueueRef.current.length === 0) {
            setPhase(prev => {
                if (prev === 'processing') {
                    setStatusText('Press the microphone to respond.');
                    return 'ready';
                }
                return prev;
            });
            return;
        }

        isPlayingRef.current = true;
        const buffer = audioQueueRef.current.shift()!;
        console.log('[MockTestSpeakingSession] playNextInQueue called', { bytes: buffer.byteLength });

        try {
            const audioCtx = new AudioContext();
            const decoded = await audioCtx.decodeAudioData(buffer);
            const source = audioCtx.createBufferSource();
            source.buffer = decoded;
            if (!isMuted) source.connect(audioCtx.destination);
            source.start();
            source.onended = () => {
                isPlayingRef.current = false;
                audioCtx.close();
                playNextInQueue();
                console.log('[MockTestSpeakingSession] playNextInQueue ended chunk');
            };
        } catch (err) {
            console.error('[MockTestSpeakingSession] playNextInQueue error', err);
            isPlayingRef.current = false;
            playNextInQueue();
        }
    }, [isMuted]);

    // ── Socket connection ──────────────────────────────────────────────────
    useEffect(() => {
        console.log('[MockTestSpeakingSession] Initialising socket connection', { setId, testNum });

        const socket = io(API_BASE, { transports: ['websocket'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[MockTestSpeakingSession] Socket connected', { id: socket.id });
            setStatusText('Connected — starting examiner…');
            socket.emit('speaking:start', {
                userId: user?.uid ?? null,
                setId: setId,             // e.g. "cambridge-19"
                testNum: parseInt(testNum, 10) // e.g. 1
            });
        });

        socket.on('speaking:ready', (data: { topicInfo: TopicInfo; greeting: string }) => {
            console.log('[MockTestSpeakingSession] speaking:ready received', data);
            setTopicInfo(data.topicInfo);
            setPhase('ready');
            setStatusText('Examiner is ready. Press the microphone to respond.');
            appendTranscript('ai', data.greeting);
        });

        socket.on('speaking:transcript', (data: { speaker: 'user' | 'ai'; text: string }) => {
            console.log('[MockTestSpeakingSession] speaking:transcript', { speaker: data.speaker, len: data.text.length });
            appendTranscript(data.speaker, data.text);
        });

        socket.on('speaking:ai_audio', (buffer: ArrayBuffer) => {
            console.log('[MockTestSpeakingSession] speaking:ai_audio received', { bytes: buffer?.byteLength });
            audioQueueRef.current.push(buffer);
            playNextInQueue();
        });

        socket.on('speaking:processing', (data: { status: string }) => {
            // If the backend signals 'ready' (e.g. after no-speech-detected),
            // restore the mic instead of leaving it stuck in processing.
            if (data.status === 'ready') {
                setPhase('ready');
                setStatusText('Press the microphone to respond.');
                return;
            }
            const labels: Record<string, string> = {
                transcribing: 'Transcribing your response…',
                thinking: 'Examiner is thinking…',
                speaking: 'Examiner is speaking…',
                evaluating: 'Evaluating your performance…',
            };
            setStatusText(labels[data.status] ?? data.status);
            setPhase('processing');
        });

        socket.on('speaking:evaluation_chunk', (data: { text: string }) => {
            setPhase('evaluating');
            setStatusText('Generating your band score report…');
            setEvaluation(prev => prev + data.text);
        });

        socket.on('speaking:evaluation_done', () => {
            console.log('[MockTestSpeakingSession] speaking:evaluation_done');
            setPhase('done');
            setStatusText('Evaluation complete!');
        });

        socket.on('speaking:result_saved', (data: { attemptId: number; bandScore: number }) => {
            console.log('[MockTestSpeakingSession] speaking:result_saved', data);
            setSavedAttempt(data);
        });

        socket.on('speaking:error', (data: { message: string }) => {
            console.error('[MockTestSpeakingSession] speaking:error', data);
            setPhase('error');
            setStatusText(data.message);
        });

        socket.on('disconnect', () => {
            console.log('[MockTestSpeakingSession] Socket disconnected');
        });

        return () => {
            console.log('[MockTestSpeakingSession] Cleaning up socket');
            socket.disconnect();
            stopRecording();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const appendTranscript = (speaker: 'user' | 'ai', text: string) => {
        setTranscript(prev => [
            ...prev,
            { id: `${Date.now()}-${Math.random()}`, speaker, text, timestamp: new Date() },
        ]);
        if (phase !== 'evaluating') setPhase('ready');
        setStatusText(speaker === 'ai' ? 'Press the microphone to respond.' : 'Examiner is responding…');
    };

    // ── Recording controls ─────────────────────────────────────────────────
    const startRecording = async () => {
        console.log('[MockTestSpeakingSession] startRecording called');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: MIME_TYPE });
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: MIME_TYPE });
                blob.arrayBuffer().then(buffer => {
                    console.log('[MockTestSpeakingSession] Sending audio blob', { bytes: buffer.byteLength });
                    socketRef.current?.emit('speaking:audio', { audio: buffer, mimeType: MIME_TYPE });
                });
                stream.getTracks().forEach(t => t.stop());
                if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
                setRecordingSeconds(0);
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setPhase('recording');
            setStatusText('Recording… press again to send.');
            setRecordingSeconds(0);
            recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
            console.log('[MockTestSpeakingSession] startRecording success');
        } catch (err) {
            console.error('[MockTestSpeakingSession] startRecording error', err);
            setPhase('error');
            setStatusText('Microphone access denied. Please allow microphone permissions.');
        }
    };

    const stopRecording = () => {
        console.log('[MockTestSpeakingSession] stopRecording called');
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
    };

    const handleMicClick = () => {
        if (phase === 'recording') {
            stopRecording();
        } else if (phase === 'ready') {
            startRecording();
        }
    };

    const handleEndTest = () => {
        console.log('[MockTestSpeakingSession] handleEndTest called');
        stopRecording();
        socketRef.current?.emit('speaking:end');
        setPhase('evaluating');
        setStatusText('Evaluating your performance…');
    };

    // ─── Render Helpers ────────────────────────────────────────────────────

    const micBtnClass = () => {
        if (phase === 'recording') return 'bg-red-500 hover:bg-red-600 animate-pulse shadow-red-200';
        if (phase === 'ready') return 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200';
        return 'bg-gray-300 cursor-not-allowed shadow-none';
    };

    const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <DashboardLayout role="student">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/mock-test/speaking')}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back to Speaking Tests
                    </button>
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full
                            ${sessionTimer < 60 ? 'text-red-600 bg-red-50' : sessionTimer < 180 ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-100'}`}>
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">{formatTime(sessionTimer)}</span>
                        </div>
                        <div className="text-sm text-gray-400">
                            {setId && <span className="font-medium text-gray-600">{setId} — Test {testNum}</span>}
                        </div>
                    </div>
                </div>

                {/* Status Bar */}
                <div className={`rounded-xl p-4 flex items-center gap-3 ${phase === 'error' ? 'bg-red-50 border border-red-200' :
                        phase === 'done' ? 'bg-green-50 border border-green-200' :
                            'bg-indigo-50 border border-indigo-200'
                    }`}>
                    {phase === 'connecting' && <Loader2 className="h-5 w-5 text-indigo-500 animate-spin shrink-0" />}
                    {phase === 'processing' && <Loader2 className="h-5 w-5 text-indigo-500 animate-spin shrink-0" />}
                    {phase === 'evaluating' && <Loader2 className="h-5 w-5 text-violet-500 animate-spin shrink-0" />}
                    {phase === 'recording' && <Radio className="h-5 w-5 text-red-500 animate-pulse shrink-0" />}
                    {phase === 'ready' && <Volume2 className="h-5 w-5 text-indigo-500 shrink-0" />}
                    {phase === 'done' && <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />}
                    {phase === 'error' && <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />}
                    <span className={`text-sm font-medium ${phase === 'error' ? 'text-red-700' : phase === 'done' ? 'text-green-700' : 'text-indigo-700'}`}>
                        {statusText}
                    </span>
                    {phase === 'recording' && (
                        <span className="ml-auto text-red-600 font-mono text-sm font-semibold">
                            {formatTime(recordingSeconds)}
                        </span>
                    )}
                </div>

                {/* Topic Info */}
                {(topicInfo.part1 || topicInfo.part2 || topicInfo.part3) && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-600 space-y-1">
                        {topicInfo.part1 && <p><span className="font-semibold text-gray-800">Part 1 Theme:</span> {topicInfo.part1}</p>}
                        {topicInfo.part2 && <p><span className="font-semibold text-gray-800">Part 2 Topic:</span> {topicInfo.part2}</p>}
                        {topicInfo.part3 && <p><span className="font-semibold text-gray-800">Part 3 Theme:</span> {topicInfo.part3}</p>}
                    </div>
                )}

                {/* Transcript */}
                {phase !== 'done' && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 h-96 overflow-y-auto space-y-4">
                        {transcript.length === 0 && (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                The conversation will appear here…
                            </div>
                        )}
                        {transcript.map(entry => (
                            <div key={entry.id} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${entry.speaker === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-sm'
                                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                                    }`}>
                                    <p className="text-[10px] font-semibold mb-1 opacity-70 uppercase tracking-wide">
                                        {entry.speaker === 'user' ? 'You' : 'Examiner (Sarah)'}
                                    </p>
                                    {entry.text}
                                </div>
                            </div>
                        ))}
                        <div ref={transcriptEndRef} />
                    </div>
                )}

                {/* Evaluation Result */}
                {(phase === 'evaluating' || phase === 'done') && evaluation && (
                    <div className="bg-white border border-violet-200 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-violet-500" />
                            Band Score Report
                        </h2>
                        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                            {evaluation}
                        </div>
                    </div>
                )}

                {/* Result saved confirmation + Expert review CTA */}
                {phase === 'done' && savedAttempt && (
                    <div className="space-y-3">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                            <Save className="h-5 w-5 text-emerald-600 shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold text-emerald-800">
                                    Result saved to your Progress dashboard
                                </p>
                                <p className="text-emerald-600 mt-0.5">
                                    Band Score: <strong>{savedAttempt.bandScore}</strong> · View it on your{' '}
                                    <button
                                        onClick={() => navigate('/progress')}
                                        className="underline hover:text-emerald-800 font-semibold"
                                    >
                                        Progress page
                                    </button>
                                </p>
                            </div>
                        </div>

                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between gap-4">
                            <div className="text-sm">
                                <p className="font-semibold text-indigo-800">
                                    Want a deeper review from a human expert?
                                </p>
                                <p className="text-indigo-600 mt-0.5">
                                    Get personalised feedback and a professional band score assessment.
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/marketplace')}
                                className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Request Expert Review
                            </button>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="flex items-center justify-center gap-6">

                    {/* Mute toggle */}
                    <button
                        onClick={() => setIsMuted(m => !m)}
                        className="p-3 rounded-full border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
                        title={isMuted ? 'Unmute examiner' : 'Mute examiner'}
                    >
                        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>

                    {/* Main mic button */}
                    <button
                        onClick={handleMicClick}
                        disabled={phase !== 'ready' && phase !== 'recording'}
                        className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-200 ${micBtnClass()}`}
                        title={phase === 'recording' ? 'Stop and send response' : 'Start recording'}
                    >
                        {phase === 'recording'
                            ? <MicOff className="h-8 w-8" />
                            : <Mic className="h-8 w-8" />
                        }
                    </button>

                    {/* End test */}
                    <button
                        onClick={handleEndTest}
                        disabled={phase === 'evaluating' || phase === 'done' || phase === 'connecting'}
                        className="p-3 rounded-full border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="End test and get evaluation"
                    >
                        <Square className="h-5 w-5" />
                    </button>
                </div>

                <p className="text-center text-xs text-gray-400">
                    Press <strong>🎙️ Mic</strong> to speak, then press again to send. Press <strong>⏹ Stop</strong> when finished to get your band score.
                </p>

            </div>
        </DashboardLayout>
    );
}
