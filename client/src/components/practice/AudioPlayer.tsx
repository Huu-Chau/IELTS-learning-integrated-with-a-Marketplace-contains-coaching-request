/**
 * AudioPlayer.tsx
 *
 * Monochrome audio player component with play/pause, seekbar,
 * time display, speed control, and vertical volume slider.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
    title?: string;
}

export default function AudioPlayer({ src, title }: AudioPlayerProps) {
    console.log('[AudioPlayer] render called', { src, title });

    const audioRef = useRef<HTMLAudioElement>(null);
    const seekBarRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [volume, setVolume] = useState(1);
    const [showVolume, setShowVolume] = useState(false);
    
    // Blob state for local seeking
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    
    // Flag to prevent onTimeUpdate from overwriting a user seek
    const isSeeking = useRef(false);

    // ── Fetch audio as Blob to enable perfect local seeking ───────────────
    useEffect(() => {
        if (!src) return;

        let active = true;
        setIsLoadingAudio(true);
        setBlobUrl(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);

        fetch(src)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.blob();
            })
            .then(blob => {
                if (!active) return;
                const url = URL.createObjectURL(blob);
                setBlobUrl(url);
                setIsLoadingAudio(false);
            })
            .catch(err => {
                console.error('[AudioPlayer] failed to fetch audio blob', err);
                if (active) setIsLoadingAudio(false);
            });

        return () => {
            active = false;
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    const togglePlay = () => {
        console.log('[AudioPlayer] togglePlay called', { wasPlaying: isPlaying });
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    // ── Seek via range input (drag) ──────────────────────────────────────────
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const t = Number(e.target.value);
        isSeeking.current = true;
        if (audioRef.current) audioRef.current.currentTime = t;
        setCurrentTime(t);
        // Allow onTimeUpdate to resume after a short delay
        setTimeout(() => { isSeeking.current = false; }, 100);
    };

    // ── Seek via click on the progress bar track ─────────────────────────────
    const handleBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!seekBarRef.current || !duration) return;
        // Only act on clicks on the track div, not the range thumb
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT') return;

        const rect = seekBarRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(clickX / rect.width, 1));
        const newTime = ratio * duration;

        isSeeking.current = true;
        if (audioRef.current) audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        setTimeout(() => { isSeeking.current = false; }, 100);
    }, [duration]);

    const cycleSpeed = () => {
        const speeds = [0.75, 1, 1.25, 1.5, 2];
        const idx = speeds.indexOf(speed);
        const next = speeds[(idx + 1) % speeds.length];
        setSpeed(next);
        if (audioRef.current) audioRef.current.playbackRate = next;
    };

    // ── Volume control ───────────────────────────────────────────────────────
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = Number(e.target.value);
        setVolume(v);
        if (audioRef.current) audioRef.current.volume = v;
    };

    const toggleMute = () => {
        if (volume > 0) {
            setVolume(0);
            if (audioRef.current) audioRef.current.volume = 0;
        } else {
            setVolume(1);
            if (audioRef.current) audioRef.current.volume = 1;
        }
    };

    const formatTime = (s: number) =>
        `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            {blobUrl && (
                <audio
                    ref={audioRef}
                    src={blobUrl}
                    onTimeUpdate={() => {
                        // Skip state update while user is actively seeking
                        if (isSeeking.current) return;
                        setCurrentTime(audioRef.current?.currentTime ?? 0);
                    }}
                    onLoadedMetadata={() => {
                        setDuration(audioRef.current?.duration ?? 0);
                        if (audioRef.current) {
                            audioRef.current.playbackRate = speed;
                            audioRef.current.volume = volume;
                        }
                    }}
                    onEnded={() => setIsPlaying(false)}
                />
            )}

            {title && (
                <div className="flex items-center gap-2 mb-3">
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
                </div>
            )}

            <div className="flex items-center gap-3">
                {/* Play/Pause button */}
                <button
                    onClick={togglePlay}
                    disabled={isLoadingAudio}
                    className="w-10 h-10 rounded-full bg-gray-900 hover:bg-gray-700 text-white flex items-center justify-center transition-colors shadow shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoadingAudio ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isPlaying ? (
                        <Pause className="h-4 w-4" />
                    ) : (
                        <Play className="h-4 w-4 ml-0.5" />
                    )}
                </button>

                {/* Seekbar + time */}
                <div className="flex-1">
                    <div
                        ref={seekBarRef}
                        onClick={handleBarClick}
                        className="relative cursor-pointer py-1"
                    >
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            step={0.1}
                            value={currentTime}
                            onChange={handleSeek}
                            disabled={isLoadingAudio}
                            className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed
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
                    disabled={isLoadingAudio}
                    className="text-[11px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg px-2.5 py-1.5 transition-colors shrink-0 disabled:opacity-50"
                >
                    {speed}x
                </button>

                {/* Volume button + vertical slider */}
                <div
                    className="relative shrink-0"
                    onMouseEnter={() => setShowVolume(true)}
                    onMouseLeave={() => setShowVolume(false)}
                >
                    {/* Volume popup — sits above the button, NO gap */}
                    {showVolume && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-0 z-10">
                            <div className="w-9 h-28 bg-white border border-gray-200 rounded-xl shadow-lg flex items-center justify-center">
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="w-20 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer -rotate-90
                                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:cursor-pointer
                                    [&::-webkit-slider-thumb]:shadow-md"
                                    style={{
                                        background: `linear-gradient(to right, #1a1a2e ${volume * 100}%, #e5e7eb ${volume * 100}%)`,
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Volume icon button */}
                    <button
                        onClick={toggleMute}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                        title={volume === 0 ? 'Unmute' : 'Mute'}
                    >
                        {volume === 0
                            ? <VolumeX className="h-4 w-4" />
                            : <Volume2 className="h-4 w-4" />
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}