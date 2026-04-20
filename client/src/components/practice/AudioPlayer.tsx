/**
 * AudioPlayer.tsx
 *
 * Monochrome audio player component with play/pause, seekbar,
 * time display, and speed control. Black/white/gray design.
 */
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

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

    useEffect(() => {
        // Reset state when src changes
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
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
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
                onLoadedMetadata={() => {
                    setDuration(audioRef.current?.duration ?? 0);
                    if (audioRef.current) audioRef.current.playbackRate = speed;
                }}
                onEnded={() => setIsPlaying(false)}
            />

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
                    className="w-10 h-10 rounded-full bg-gray-900 hover:bg-gray-700 text-white flex items-center justify-center transition-colors shadow shrink-0"
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
