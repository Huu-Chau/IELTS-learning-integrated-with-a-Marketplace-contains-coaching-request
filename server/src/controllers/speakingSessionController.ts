/**
 * Speaking Session Controller
 *
 * Manages the IELTS Speaking examiner AI via Socket.io.
 * Ports the Examiner class from Gemma_S/src/examiner.ts for web use.
 *
 * Socket events (client → server):
 *   speaking:start    → Initialize session, emit AI greeting as audio
 *   speaking:audio    → Receive audio blob → STT → Ollama → TTS → emit back
 *   speaking:end      → Request band score evaluation
 *
 * Socket events (server → client):
 *   speaking:ready         → Session initialized with topic info + greeting text
 *   speaking:transcript    → { speaker: 'user'|'ai', text: string }
 *   speaking:ai_audio      → Binary MP3 buffer for browser playback
 *   speaking:processing    → Status update while processing
 *   speaking:evaluation_chunk → Streamed evaluation text
 *   speaking:evaluation_done  → Evaluation complete
 *   speaking:error         → { message: string }
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Ollama } from 'ollama';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConversationMessage, ExamTopic, FluencyMetrics, TranscriptionResult } from '../types/ai-types';
import { storageProvider } from '../services/storage/StorageService';
import { attemptService } from '../services/attemptService';
import MockMaterial from '../models/MockMaterial';

const execAsync = promisify(exec);

// ─── Configuration ──────────────────────────────────────────────────────────

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL_NAME = 'gemma3:4b';

/** Resolve the venv Python executable (same discovery logic as original) */
function getVenvPython(): string {
    const candidates = [
        '/opt/venv/bin/python3',                                                                  // Docker image path (highest priority)
        path.resolve(__dirname, '../../../../speakingAgents/Gemma_S/.venv/bin/python3'),          // local Gemma_S venv
        path.resolve(__dirname, '../../../.venv/bin/python3'),                                    // project-level venv
        'python3',                                                                                // system fallback
    ];
    for (const p of candidates) {
        if (p === 'python3' || fs.existsSync(p)) return p;
    }
    return 'python3';
}

/** Path to the stt_from_file.py script */
const STT_SCRIPT = path.resolve(__dirname, '../../scripts/stt_from_file.py');

/** British English female voice for the IELTS examiner persona */
const TTS_VOICE = 'en-GB-SoniaNeural';

// ─── Topic Bank ──────────────────────────────────────────────────────────────

const TOPIC_BANK: ExamTopic[] = [
    {
        part1Theme: 'Work & Studies',
        part1Questions: [
            'Do you work or are you a student?',
            'What do you enjoy most about your work/studies?',
            'Would you like to change your job/field of study in the future?',
        ],
        part2Card: `Describe a person who has had a big influence on your life.\nYou should say:\n- who this person is\n- how you know this person\n- what this person has done to influence you\nand explain why this person has had such a big influence.`,
        part3Theme: 'Leadership & Role Models',
    },
    {
        part1Theme: 'Hometown & Living',
        part1Questions: [
            'Where is your hometown?',
            'What do you like most about living there?',
            'Has your hometown changed much in recent years?',
        ],
        part2Card: `Describe a place you have visited that you found particularly beautiful.\nYou should say:\n- where it is\n- when you went there\n- what you did there\nand explain why you found it beautiful.`,
        part3Theme: 'Tourism & Environmental Impact',
    },
    {
        part1Theme: 'Hobbies & Free Time',
        part1Questions: [
            'What do you enjoy doing in your free time?',
            'Have your hobbies changed since you were younger?',
            'Do you prefer indoor or outdoor activities?',
        ],
        part2Card: `Describe a skill you learned that you are proud of.\nYou should say:\n- what the skill is\n- how you learned it\n- how long it took to learn\nand explain why you are proud of this skill.`,
        part3Theme: 'Education & Self-improvement',
    },
    {
        part1Theme: 'Technology & Internet',
        part1Questions: [
            'How often do you use the internet?',
            'What do you mostly use your phone for?',
            'Do you think children spend too much time on technology?',
        ],
        part2Card: `Describe a book, movie, or TV show that made a strong impression on you.\nYou should say:\n- what it was\n- when you read/watched it\n- what it was about\nand explain why it made such an impression.`,
        part3Theme: 'Media Influence & Critical Thinking',
    },
];

// ─── System Prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(topic: ExamTopic): string {

    return `You are a certified IELTS Speaking examiner named Sarah. Your role is to conduct an authentic IELTS Speaking test and evaluate the student's answers.
## Test Structure
Follow this structure strictly:

### Part 1 - Introduction (4-5 minutes)
Theme: "${topic.part1Theme}"
Start IMMEDIATELY with the first question below. Do NOT ask the candidate's name or make small talk — the test has already begun.
Ask these questions one at a time:
${topic.part1Questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

### Part 2 - Long Turn (3-4 minutes)
Give the candidate this topic card:
"""
${topic.part2Card}
"""
Give them 1 minute to prepare, then ask them to speak for 1-2 minutes.
After they finish, ask 1-2 brief follow-up questions.

### Part 3 - Discussion (4-5 minutes)
Theme: "${topic.part3Theme}"
Ask 3-4 abstract, analytical questions related to this theme.

## Rules
- NEVER break character. You are the examiner, NOT an AI assistant.
- Ask ONE question at a time and wait for the candidate's response.
- Keep your responses very concise: 1 sentence for acknowledgments, 2 sentences max for transitions.
- Transition between parts naturally (e.g., "Now let's move on to Part 2...").
- Do NOT give scores or feedback during the test.
- Do NOT assess pronunciation since this is a voice-to-text test.
- NEVER include stage directions, actions, or narration in parentheses (), asterisks **, or brackets []. Only output spoken dialogue.
- Respond QUICKLY — brevity is critical for natural conversation flow.`;
}


// ─── Text Processing ─────────────────────────────────────────────────────────

/** Strip stage directions from AI output before TTS. */
function stripStageDirections(text: string): string {
    return text
        .replace(/\([\s\S]*?\)/g, '')
        .replace(/\*[\s\S]*?\*/g, '')
        .replace(/\[[\s\S]*?\]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * Extract the overall IELTS band score from AI evaluation text.
 * Searches for patterns like "Overall Estimated Band Score: 6.5" or
 * "Overall Band: 7.0" and returns the numeric value.
 * Falls back to 0 if no score can be parsed.
 */
function extractBandScore(evaluationText: string): number {
    console.log('[SpeakingController] extractBandScore called', { textLength: evaluationText.length });

    // Try common patterns the AI uses for the overall score
    const patterns = [
        /overall\s*(?:estimated\s*)?band\s*(?:score)?\s*[:=\-–—]\s*(\d+(?:\.\d+)?)/i,
        /\*\*overall\s*(?:estimated\s*)?band\s*(?:score)?\*\*\s*[:=\-–—]\s*(\d+(?:\.\d+)?)/i,
        /overall\s*(?:estimated\s*)?band\s*(?:score)?\s*[:=\-–—]\s*\*\*(\d+(?:\.\d+)?)\*\*/i,
        /overall\s*score\s*[:=\-–—]\s*(\d+(?:\.\d+)?)/i,
        /estimated\s*band\s*[:=\-–—]\s*(\d+(?:\.\d+)?)/i,
    ];

    for (const pattern of patterns) {
        const match = evaluationText.match(pattern);
        if (match && match[1]) {
            const score = parseFloat(match[1]);
            if (score >= 1 && score <= 9) {
                console.log('[SpeakingController] extractBandScore success', { score });
                return score;
            }
        }
    }

    console.log('[SpeakingController] extractBandScore: no score found, defaulting to 0');
    return 0;
}

// ─── STT & TTS Helpers ───────────────────────────────────────────────────────

/**
 * Transcribe an audio blob buffer using the stt_from_file.py script.
 * Saves the blob to a temp file, runs STT, then cleans up.
 */
async function transcribeAudioBlob(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult> {
    console.log('[SpeakingController] transcribeAudioBlob called', { size: audioBuffer.length, mimeType });

    const ext = mimeType.includes('webm') ? '.webm' : mimeType.includes('ogg') ? '.ogg' : '.wav';
    const tmpAudio = path.join(os.tmpdir(), `stt_in_${Date.now()}${ext}`);

    try {
        fs.writeFileSync(tmpAudio, audioBuffer);
        const pythonBin = getVenvPython();
        const { stdout, stderr } = await execAsync(
            `${pythonBin} "${STT_SCRIPT}" "${tmpAudio}"`,
            { timeout: 60000 }
        );

        if (stderr) {
            console.log('[SpeakingController] STT stderr (debug):', stderr.split('\n').slice(-3).join(' | '));
        }

        const result: TranscriptionResult = JSON.parse(stdout.trim());
        console.log('[SpeakingController] transcribeAudioBlob success', {
            text: result.text.substring(0, 60),
            wpm: result.fluency?.wordsPerMinute,
        });
        return result;
    } catch (error) {
        console.error('[SpeakingController] transcribeAudioBlob error', error);
        return { text: '', fluency: null };
    } finally {
        try { fs.unlinkSync(tmpAudio); } catch { /* ignore */ }
    }
}

/**
 * Generate TTS audio using edge-tts and return it as a Buffer.
 * Returns null if text is empty or TTS fails.
 */
async function generateTtsAudio(text: string): Promise<Buffer | null> {
    console.log('[SpeakingController] generateTtsAudio called', { textLength: text.length });

    const cleanText = stripStageDirections(text);
    if (!cleanText || cleanText.length < 2) {
        console.log('[SpeakingController] generateTtsAudio: empty text, skipping');
        return null;
    }

    const pythonBin = getVenvPython();
    const tmpText = path.join(os.tmpdir(), `tts_in_${Date.now()}.txt`);
    const tmpAudio = path.join(os.tmpdir(), `tts_out_${Date.now()}.mp3`);

    try {
        fs.writeFileSync(tmpText, cleanText, 'utf-8');
        await execAsync(
            `${pythonBin} -m edge_tts --voice "${TTS_VOICE}" --file "${tmpText}" --write-media "${tmpAudio}"`,
            { timeout: 30000 }
        );

        const audioBuffer = fs.readFileSync(tmpAudio);
        console.log('[SpeakingController] generateTtsAudio success', { bytes: audioBuffer.length });
        return audioBuffer;
    } catch (error) {
        console.error('[SpeakingController] generateTtsAudio error', error);
        return null;
    } finally {
        try { fs.unlinkSync(tmpText); } catch { /* ignore */ }
        try { fs.unlinkSync(tmpAudio); } catch { /* ignore */ }
    }
}

// ─── Session State ───────────────────────────────────────────────────────────

interface SpeakingSession {
    topic: ExamTopic;
    history: ConversationMessage[];
    fluencyLog: FluencyMetrics[];
    /** Collected raw audio buffers for stitching into a master recording */
    audioChunks: Buffer[];
    /** Firebase UID of the student (optional — passed from client on start) */
    userId: string | null;
}

// In-memory session store per socket ID
const sessions = new Map<string, SpeakingSession>();

// ─── Socket.io Event Handlers ─────────────────────────────────────────────────

function registerSpeakingHandlers(socket: Socket): void {
    console.log('[SpeakingController] New socket connected:', socket.id);

    // ── speaking:start ──────────────────────────────────────────
    socket.on('speaking:start', async (data?: { userId?: string; setId?: string; testNum?: number; materialId?: number; part?: string }) => {
        console.log('[SpeakingController] speaking:start called', { socketId: socket.id, ...data });
        try {
            // Verify Ollama is reachable
            const ollama = new Ollama({ host: OLLAMA_HOST });
            await ollama.list();

            let topic: ExamTopic | undefined;

            if (data?.setId && data?.testNum) {
                try {
                    // Extract book matching DB convention, e.g. "cambridge-19" -> "Cambridge 19"
                    const bookNameMatch = data.setId.match(/\d+/);
                    const bookQuery = bookNameMatch ? `Cambridge ${bookNameMatch[0]}` : null;

                    if (bookQuery) {
                        const material = await MockMaterial.findOne({
                            where: { skill: 'SPEAKING', book: bookQuery }
                        });

                        const content = material?.content as any;
                        if (content && content.tests) {
                            const testData = content.tests.find((t: any) => t.test_number === data.testNum);
                            
                            if (testData && testData.parts) {
                                const p1 = testData.parts.find((p: any) => p.part_number === 1);
                                const p2 = testData.parts.find((p: any) => p.part_number === 2);
                                const p3 = testData.parts.find((p: any) => p.part_number === 3);

                                topic = {
                                    part1Theme: p1?.topic || 'General Topics',
                                    part1Questions: p1?.questions || [ 'Tell me about yourself.' ],
                                    part2Card: `${p2?.instructions || ''}\nYou should say:\n${(p2?.bullet_points || []).map((bp: string) => `- ${bp}`).join('\n')}`,
                                    part3Theme: p3?.topic || 'Extended Discussion'
                                };
                                console.log('[SpeakingController] Loaded specific test content from DB', { book: bookQuery, test: data.testNum });
                            }
                        }
                    }
                } catch (dbErr) {
                    console.error('[SpeakingController] Failed to query DB for specific test material', dbErr);
                }
            }

            // Fallback to random topic test bank if DB lookup failed
            if (!topic) {
                topic = TOPIC_BANK[Math.floor(Math.random() * TOPIC_BANK.length)];
                console.log('[SpeakingController] Using random topic from TOPIC_BANK (fallback)');
            }

            const systemPrompt = buildSystemPrompt(topic);
            // Build the opening greeting that goes directly to Part 1's first question
            const firstQuestion = topic.part1Questions[0] || 'Tell me about yourself.';
            const greeting = `Good afternoon. I'm Sarah, your examiner today. Let's begin Part 1. The theme is ${topic.part1Theme}. ${firstQuestion}`;

            const session: SpeakingSession = {
                topic,
                history: [
                    { role: 'system', content: systemPrompt },
                    { role: 'assistant', content: greeting },
                ],
                fluencyLog: [],
                audioChunks: [],
                userId: data?.userId || null,
            };
            sessions.set(socket.id, session);

            socket.emit('speaking:ready', {
                topicInfo: {
                    part1: topic.part1Theme,
                    part2: topic.part2Card?.split('\n')[0] || undefined, // First line is the topic title
                    part3: topic.part3Theme,
                },
                greeting,
            });

            // Send greeting as TTS audio
            const greetingAudio = await generateTtsAudio(greeting);
            if (greetingAudio) {
                socket.emit('speaking:ai_audio', greetingAudio);
            }

            console.log('[SpeakingController] speaking:start success', { socketId: socket.id });
        } catch (error) {
            console.error('[SpeakingController] speaking:start error', error);
            socket.emit('speaking:error', { message: 'Could not connect to AI model. Is Ollama running?' });
        }
    });

    // ── speaking:audio ──────────────────────────────────────────
    socket.on('speaking:audio', async (data: { audio: Buffer; mimeType: string }) => {
        console.log('[SpeakingController] speaking:audio called', {
            socketId: socket.id,
            size: data?.audio?.length,
        });

        const session = sessions.get(socket.id);
        if (!session) {
            socket.emit('speaking:error', { message: 'No active session. Please start a new test.' });
            return;
        }

        socket.emit('speaking:processing', { status: 'transcribing' });

        try {
            // Step 1: Transcribe audio
            const audioBuffer = Buffer.isBuffer(data.audio)
                ? data.audio
                : Buffer.from(data.audio as unknown as ArrayBuffer);

            // Collect the raw audio chunk for master record stitching
            session.audioChunks.push(audioBuffer);

            const sttResult = await transcribeAudioBlob(audioBuffer, data.mimeType || 'audio/webm');

            if (!sttResult.text) {
                socket.emit('speaking:transcript', { speaker: 'user', text: '[No speech detected]' });
                // Reset client back to ready so the mic isn't stuck in processing
                socket.emit('speaking:processing', { status: 'ready' });
                return;
            }

            // Send user transcript back
            socket.emit('speaking:transcript', { speaker: 'user', text: sttResult.text });

            // Log fluency metrics
            if (sttResult.fluency) {
                session.fluencyLog.push(sttResult.fluency);
            }

            // Step 2: Generate AI response via Ollama
            socket.emit('speaking:processing', { status: 'thinking' });
            session.history.push({ role: 'user', content: sttResult.text });

            const ollama = new Ollama({ host: OLLAMA_HOST });
            const stream = await ollama.chat({
                model: MODEL_NAME,
                messages: session.history,
                stream: true,
            });

            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk.message?.content || '';
            }

            session.history.push({ role: 'assistant', content: fullResponse });
            socket.emit('speaking:transcript', { speaker: 'ai', text: fullResponse });

            // Step 3: Generate and send TTS audio
            socket.emit('speaking:processing', { status: 'speaking' });
            const ttsAudio = await generateTtsAudio(fullResponse);
            if (ttsAudio) {
                socket.emit('speaking:ai_audio', ttsAudio);
            }

            console.log('[SpeakingController] speaking:audio success', { socketId: socket.id });
        } catch (error) {
            console.error('[SpeakingController] speaking:audio error', error);
            socket.emit('speaking:error', { message: 'Failed to process audio. Please try again.' });
        }
    });

    // ── speaking:end ────────────────────────────────────────────
    socket.on('speaking:end', async () => {
        console.log('[SpeakingController] speaking:end called', { socketId: socket.id });

        const session = sessions.get(socket.id);
        if (!session) {
            socket.emit('speaking:error', { message: 'No active session to evaluate.' });
            return;
        }

        try {
            socket.emit('speaking:processing', { status: 'evaluating' });

            // Build fluency summary from logged metrics
            let fluencySummary = '';
            if (session.fluencyLog.length > 0) {
                const log = session.fluencyLog;
                const avgWPM = log.reduce((s, f) => s + f.wordsPerMinute, 0) / log.length;
                const totalPauses = log.reduce((s, f) => s + f.pauseCount, 0);
                const avgPause = log.reduce((s, f) => s + f.avgPauseDuration, 0) / log.length;
                const longestPause = Math.max(...log.map(f => f.longestPause));
                const totalWords = log.reduce((s, f) => s + f.wordCount, 0);

                fluencySummary = `
## Speech Analytics (from audio analysis)
- Average Speech Rate: ${avgWPM.toFixed(1)} words per minute
- Total Significant Pauses (>0.5s): ${totalPauses}
- Average Pause Duration: ${avgPause.toFixed(2)}s
- Longest Single Pause: ${longestPause.toFixed(2)}s
- Total Words Spoken: ${totalWords}

Use these metrics to inform your Fluency & Coherence assessment.`;
            }

            const gradingPrompt = `The speaking test is now over. Based on our entire conversation, provide an IELTS Speaking assessment.
${fluencySummary}

## Evaluation Instructions & Official Rubric

Grade ONLY these 3 criteria (do NOT grade pronunciation — this was a voice-to-text test):
1. **Fluency & Coherence** (Band 1-9)
2. **Lexical Resource** (Band 1-9)
3. **Grammatical Range & Accuracy** (Band 1-9)

For each criterion: Band Score, one Strength (with example), one Improvement (with example).
End with **Overall Estimated Band Score** (average of the 3 criteria).`;

            const evalMessages: ConversationMessage[] = [
                ...session.history,
                {
                    role: 'system',
                    content:
                        'OVERRIDE: The speaking test has ended NOW. You are NO LONGER the examiner. ' +
                        'You are a grading assistant. Do NOT continue the test. ' +
                        'Your ONLY job is to evaluate the conversation and produce a band score assessment.',
                },
                { role: 'user', content: gradingPrompt },
            ];

            const ollama = new Ollama({ host: OLLAMA_HOST });
            const stream = await ollama.chat({
                model: MODEL_NAME,
                messages: evalMessages,
                stream: true,
            });

            let fullEvaluation = '';
            for await (const chunk of stream) {
                const content = chunk.message?.content || '';
                if (content) {
                    fullEvaluation += content;
                    socket.emit('speaking:evaluation_chunk', { text: content });
                }
            }

            socket.emit('speaking:evaluation_done');

            // ── Upload master recording to object storage ──────────────────
            if (session.audioChunks.length > 0) {
                try {
                    const masterBuffer = Buffer.concat(session.audioChunks);
                    const timestamp = Date.now();
                    const filename = `sessions/${socket.id}/${timestamp}_master.webm`;

                    console.log('[SpeakingController] Uploading master recording', {
                        chunks: session.audioChunks.length,
                        totalBytes: masterBuffer.length,
                        filename,
                    });

                    const recordingUrl = await storageProvider.uploadFile(
                        filename,
                        masterBuffer,
                        'audio/webm'
                    );

                    // Emit the recording URL back to the client
                    socket.emit('speaking:recording_saved', { recordingPath: recordingUrl });
                    console.log('[SpeakingController] Master recording uploaded', { recordingUrl });

                    // ── Save Attempt record to PostgreSQL ──────────────────────
                    if (session.userId) {
                        try {
                            // Extract the real band score from the evaluation text
                            const bandScore = extractBandScore(fullEvaluation);

                            // Build full transcript from conversation history (exclude system prompts)
                            const transcript = session.history
                                .filter(msg => msg.role !== 'system')
                                .map(msg => ({
                                    speaker: msg.role === 'user' ? 'student' : 'examiner',
                                    text: msg.content,
                                }));

                            const attempt = await attemptService.createAttempt({
                                userId: session.userId,
                                testId: `speaking_${timestamp}`,
                                type: 'speaking',
                                score: bandScore,
                                feedback: fullEvaluation,
                                answers: {
                                    topic: session.topic.part1Theme,
                                    part3Theme: session.topic.part3Theme,
                                    conversationLength: session.history.length,
                                    transcript,
                                    fluencyMetrics: session.fluencyLog,
                                },
                                recordingPath: recordingUrl,
                            });
                            console.log('[SpeakingController] Attempt saved to DB', { attemptId: attempt.id, bandScore });

                            // Notify the client that the result was saved
                            socket.emit('speaking:result_saved', {
                                attemptId: attempt.id,
                                bandScore,
                            });
                        } catch (dbError) {
                            console.error('[SpeakingController] Attempt DB save failed', dbError);
                        }
                    }
                } catch (uploadError) {
                    console.error('[SpeakingController] Master recording upload failed', uploadError);
                    // Non-fatal: the evaluation still succeeded
                }
            }

            // Clean up session
            sessions.delete(socket.id);
            console.log('[SpeakingController] speaking:end success', { socketId: socket.id });
        } catch (error) {
            console.error('[SpeakingController] speaking:end error', error);
            socket.emit('speaking:error', { message: 'Evaluation failed.' });
        }
    });

    // ── Disconnect cleanup ────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log('[SpeakingController] Socket disconnected, cleaning up session:', socket.id);
        sessions.delete(socket.id);
    });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function registerSpeakingSocketHandlers(io: SocketIOServer): void {
    console.log('[SpeakingController] registerSpeakingSocketHandlers called');
    io.on('connection', (socket: Socket) => {
        registerSpeakingHandlers(socket);
    });
    console.log('[SpeakingController] registerSpeakingSocketHandlers success — listening for connections');
}
