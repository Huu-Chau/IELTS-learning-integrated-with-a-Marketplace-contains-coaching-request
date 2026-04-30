/**
 * AudioPlayer.tsx
 *
 * Monochrome audio player component with play/pause, seekbar,
 * time display, and speed control. Black/white/gray design.
 *
 * Fixes applied:
 *  - audio.play() is awaited and its rejection caught (prevents NotSupportedError crash)
 *  - audio.load() is called when src changes (required when setting src via React prop)
 *  - isPlaying is driven by `play` / `pause` events, not optimistic state
 *  - Displays a friendly error banner when the audio source cannot be loaded
 */
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, AlertCircle } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
    title?: string;
}

export default function AudioPlayer({ src, title }: AudioPlayerProps) {
    console.log('[AudioPlayer] render called', { src, title });

    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [audioError, setAudioError] = useState<string | null>(null);

    // ── Reset + reload when src changes ───────────────────────────────────────
    useEffect(() => {
        console.log('[AudioPlayer] src changed, reloading', { src });
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setAudioError(null);

        const audio = audioRef.current;
        if (!audio) return;

        audio.pause();
        audio.currentTime = 0;
        // CRITICAL: call load() so the browser picks up the new src
        audio.load();
    }, [src]);

    // ── Drive isPlaying from native audio events (not optimistic state) ───────
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onPlay  = () => { console.log('[AudioPlayer] play event'); setIsPlaying(true); };
        const onPause = () => { console.log('[AudioPlayer] pause event'); setIsPlaying(false); };
        const onEnded = () => { console.log('[AudioPlayer] ended event'); setIsPlaying(false); };

        audio.addEventListener('play',  onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('play',  onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

    // ── Play / Pause ──────────────────────────────────────────────────────────
    const togglePlay = async () => {
        console.log('[AudioPlayer] togglePlay called', { isPlaying });
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            try {
                await audio.play();
                console.log('[AudioPlayer] play() resolved');
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error('[AudioPlayer] play() rejected', err);
                setAudioError(`Cannot play audio: ${msg}`);
                setIsPlaying(false);
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const t = Number(e.target.value);
        if (audioRef.current) audioRef.current.currentTime = t;
        setCurrentTime(t);
    };

    const cycleSpeed = () => {
        const speeds = [0.75, 1, 1.25, 1.5, 2];
        const idx = speeds.indexOf(speed);
        const next = speeds[(idx + 1) % speeds.length];
        console.log('[AudioPlayer] cycleSpeed', { from: speed, to: next });
        setSpeed(next);
        if (audioRef.current) audioRef.current.playbackRate = next;
    };

    const formatTime = (s: number) =>
        `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            {/* Hidden native audio element */}
            <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
                onLoadedMetadata={() => {
                    console.log('[AudioPlayer] loadedmetadata', { duration: audioRef.current?.duration });
                    setDuration(audioRef.current?.duration ?? 0);
                    setAudioError(null);
                    if (audioRef.current) audioRef.current.playbackRate = speed;
                }}
                onError={(e) => {
                    const media = e.currentTarget as HTMLAudioElement;
                    const code = media.error?.code ?? 0;
                    const msgs: Record<number, string> = {
                        1: 'Audio loading aborted.',
                        2: 'Network error loading audio.',
                        3: 'Audio decoding failed.',
                        4: 'Audio format not supported or file not found.',
                    };
                    const msg = msgs[code] ?? 'Unknown audio error.';
                    console.error('[AudioPlayer] audio element error', { code, msg, src });
                    setAudioError(msg);
                    setIsPlaying(false);
                }}
            />

            {/* Title row */}
            {title && (
                <div className="flex items-center gap-2 mb-3">
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
                </div>
            )}

            {/* Error banner */}
            {audioError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{audioError}</span>
                </div>
            )}

            <div className="flex items-center gap-3">
                {/* Play/Pause button */}
                <button
                    onClick={togglePlay}
                    disabled={!!audioError}
                    className="w-10 h-10 rounded-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white flex items-center justify-center transition-colors shadow shrink-0"
                >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </button>

                {/* Seekbar + time */}
                <div className="flex-1">
                    <div className="relative">
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-sm"
                            style={{
                                background: `linear-gradient(to right, #1a1a2e ${progress}%, #e5e7eb ${progress}%)`,
                            }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 font-mono">
                        <span>{formatTime(currentTime)}</span>
                        <span>{duration ? formatTime(duration) : '--:--'}</span>
                    </div>
                </div>

                {/* Speed button */}
                <button
                    onClick={cycleSpeed}
                    className="text-[11px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg px-2.5 py-1.5 transition-colors shrink-0"
                >
                    {speed}x
                </button>
            </div>
        </div>
    );
}

