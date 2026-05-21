"""
STT From File — Faster-Whisper with Fluency Metrics

Adapted from Gemma_S/src/stt_service.py for web API use.
Instead of recording from a microphone (pyaudio), this script:
  1. Accepts a WAV/WEBM file path as a command-line argument
  2. Converts WEBM to WAV using ffmpeg if needed
  3. Transcribes with faster-whisper + word timestamps
  4. Extracts fluency metrics
  5. Prints JSON result to stdout and exits

Usage:
  python3 stt_from_file.py <audio_file_path>

Output (stdout):
  {"text": "...", "fluency": {wordsPerMinute, pauseCount, ...}} on success
  {"text": "", "fluency": null}                                 on silence/error
"""

import sys
import json
import os
import subprocess
import tempfile

# pyright: ignore [reportMissingImports]
from faster_whisper import WhisperModel

# Context prompt to steer Whisper toward IELTS vocabulary
WHISPER_PROMPT = (
    "This is an IELTS Speaking test. The candidate is answering questions "
    "about hobbies, hometown, work, studies, travel, food, and technology."
)

# Known Whisper hallucinations on silence/noise — filter these out
HALLUCINATIONS = [
    "thank you", "thanks for watching", "bye", "oh my god",
    "subscribe", "like and subscribe", "see you next time",
    "you", "the end", "thanks",
]

def has_excessive_repetitions(text: str) -> bool:
    """Detect if the text has excessive word repetitions typical of Whisper hallucinations on silence."""
    words = [w.strip(".,!?\"'()").lower() for w in text.split()]
    if not words:
        return False
        
    # Check for 3 or more consecutive identical words
    consecutive_count = 1
    for i in range(1, len(words)):
        if words[i] == words[i - 1] and words[i] != "":
            consecutive_count += 1
            if consecutive_count >= 3:
                return True
        else:
            consecutive_count = 1

    # Also check if most of the output consists of prompt keywords
    prompt_keywords = {"ielts", "examiner", "band", "score", "fluency", "coherence"}
    if len(words) >= 4:
        keyword_matches = sum(1 for w in words if w in prompt_keywords)
        if keyword_matches / len(words) > 0.7:
            return True

    return False



# ─── Audio Conversion ────────────────────────────────────────────────────────

def convert_to_wav(input_path: str) -> str:
    """
    Convert any audio format to 16kHz mono WAV using ffmpeg.
    Returns the path to the converted WAV file.
    """
    print("[STT_FILE] convert_to_wav called", file=sys.stderr)
    fd, wav_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)

    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", input_path,
                "-ar", "16000",   # 16kHz sample rate (Whisper requirement)
                "-ac", "1",       # Mono channel
                "-f", "wav",
                wav_path,
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode != 0:
            print(f"[STT_FILE] ffmpeg error: {result.stderr}", file=sys.stderr)
            raise RuntimeError(f"ffmpeg conversion failed: {result.stderr}")

        print("[STT_FILE] convert_to_wav success", file=sys.stderr)
        return wav_path
    except Exception as e:
        # Clean up partial file
        try:
            os.remove(wav_path)
        except OSError:
            pass
        raise e


# ─── Fluency Metrics ────────────────────────────────────────────────────────

def extract_fluency_metrics(segments_list: list, audio_duration: float) -> dict:
    """
    Extract fluency metrics from Whisper word-level timestamps.
    Identical logic to stt_service.py.
    """
    print("[STT_FILE] extract_fluency_metrics called", file=sys.stderr)

    all_words = []
    for seg in segments_list:
        if hasattr(seg, "words") and seg.words:
            all_words.extend(seg.words)

    word_count = len(all_words)

    if word_count == 0:
        return {
            "wordsPerMinute": 0,
            "pauseCount": 0,
            "avgPauseDuration": 0,
            "longestPause": 0,
            "audioDuration": round(audio_duration, 2),
            "wordCount": 0,
        }

    # Speech rate
    wpm = (word_count / audio_duration) * 60 if audio_duration > 0 else 0

    # Pause analysis — gaps > 0.5s between consecutive words
    pauses = []
    for i in range(1, len(all_words)):
        gap = all_words[i].start - all_words[i - 1].end
        if gap > 0.5:
            pauses.append(gap)

    metrics = {
        "wordsPerMinute": round(wpm, 1),
        "pauseCount": len(pauses),
        "avgPauseDuration": round(sum(pauses) / len(pauses), 2) if pauses else 0,
        "longestPause": round(max(pauses), 2) if pauses else 0,
        "audioDuration": round(audio_duration, 2),
        "wordCount": word_count,
    }
    print(f"[STT_FILE] extract_fluency_metrics success {metrics}", file=sys.stderr)
    return metrics


# ─── Transcription ───────────────────────────────────────────────────────────

def transcribe(model: WhisperModel, wav_path: str) -> dict:
    """
    Transcribe audio file. Returns { text, fluency } or { text: "", fluency: None }.
    """
    print("[STT_FILE] transcribe called", file=sys.stderr)

    segments, info = model.transcribe(
        wav_path,
        beam_size=5,
        word_timestamps=True,
        condition_on_previous_text=False,
        initial_prompt=WHISPER_PROMPT,
    )

    segments_list = list(segments)
    text = " ".join([seg.text for seg in segments_list]).strip()
    audio_duration = info.duration

    # Filter hallucinations
    is_hallucination = (
        (any(h in text.lower() for h in HALLUCINATIONS) and len(text.split()) < 5)
        or has_excessive_repetitions(text)
    )

    if is_hallucination or not text:
        print("[STT_FILE] transcribe: filtered as hallucination/silence", file=sys.stderr)
        return {"text": "", "fluency": None}

    fluency = extract_fluency_metrics(segments_list, audio_duration)
    print(f"[STT_FILE] transcribe success: '{text[:60]}...'", file=sys.stderr)
    return {"text": text, "fluency": fluency}


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"text": "", "fluency": None, "error": "No audio file provided"}))
        sys.exit(1)

    input_path = sys.argv[1]
    print(f"[STT_FILE] main called with: {input_path}", file=sys.stderr)

    if not os.path.exists(input_path):
        print(json.dumps({"text": "", "fluency": None, "error": f"File not found: {input_path}"}))
        sys.exit(1)

    wav_path = None
    converted = False

    try:
        # Convert to WAV if not already (handles webm, mp4, ogg, etc.)
        if not input_path.lower().endswith(".wav"):
            wav_path = convert_to_wav(input_path)
            converted = True
        else:
            wav_path = input_path

        # Load Whisper model (base.en is fast and accurate for English)
        print("[STT_FILE] Loading Whisper model...", file=sys.stderr)
        model = WhisperModel("base.en", device="cpu", compute_type="int8")
        print("[STT_FILE] Model loaded", file=sys.stderr)

        result = transcribe(model, wav_path)
        print(json.dumps(result))

    except Exception as e:
        print(f"[STT_FILE] main error: {e}", file=sys.stderr)
        print(json.dumps({"text": "", "fluency": None, "error": str(e)}))

    finally:
        # Clean up the converted WAV temp file (not the original input)
        if converted and wav_path:
            try:
                os.remove(wav_path)
            except OSError:
                pass


if __name__ == "__main__":
    main()
