FROM node:24.13.1

# ── System dependencies ────────────────────────────────────────────────────────
# python3 + pip  → for stt_from_file.py (faster-whisper) and edge-tts
# ffmpeg         → for converting WebM audio blobs to WAV (required by Whisper)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ── Python virtual environment ────────────────────────────────────────────────
# Use a venv to avoid "externally-managed-environment" errors on Debian 12+
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install AI Python packages into the venv
# faster-whisper: local Whisper STT with word-level timestamps
# edge-tts: Microsoft neural TTS (no API key needed)
RUN pip install --no-cache-dir faster-whisper edge-tts

# ── Node application ──────────────────────────────────────────────────────────
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
RUN npm install pm2 -g

COPY . .

RUN npm run build

CMD ["pm2-runtime", "app.ecosystem.config.js"]
