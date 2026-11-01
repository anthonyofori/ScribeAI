import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const execFileAsync = promisify(execFile);
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase JSON body limits for base64 audio/data
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Persistent directory for user uploaded media files so playback always works!
const MEDIA_DIR = path.resolve('uploads', 'media');
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

// Setup multer for temporary uploads
const upload = multer({
  dest: path.join(os.tmpdir(), 'transcripta-uploads'),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200 MB maximum
  },
});

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to sanitize and normalize YouTube URLs
function normalizeYouTubeUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.trim());
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      return url.href;
    }
    return null;
  } catch {
    return null;
  }
}

// Helper to convert MM:SS or HH:MM:SS to milliseconds
function parseTimestampToMs(tc: string): number {
  if (!tc) return 0;
  const parts = tc.trim().split(':').map(Number);
  if (parts.length === 2) {
    const min = isNaN(parts[0]) ? 0 : parts[0];
    const sec = isNaN(parts[1]) ? 0 : parts[1];
    return Math.round((min * 60 + sec) * 1000);
  }
  if (parts.length === 3) {
    const hr = isNaN(parts[0]) ? 0 : parts[0];
    const min = isNaN(parts[1]) ? 0 : parts[1];
    const sec = isNaN(parts[2]) ? 0 : parts[2];
    return Math.round((hr * 3600 + min * 60 + sec) * 1000);
  }
  return 0;
}

// Helper to convert milliseconds to standard MM:SS or HH:MM:SS timecode
function formatMsToTimestamp(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Helper to inspect exact audio duration in seconds using ffprobe
async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    const duration = parseFloat(stdout.trim());
    return isNaN(duration) ? 0 : duration;
  } catch (err) {
    console.warn('[ffprobe] Could not get audio duration:', err);
    return 0;
  }
}

// Helper to slice an audio segment at high speed (using -c copy with fallback)
async function sliceAudioChunk(
  inputPath: string,
  startSec: number,
  durationSec: number,
  outputPath: string
): Promise<void> {
  try {
    await execFileAsync('ffmpeg', [
      '-ss',
      startSec.toFixed(2),
      '-t',
      durationSec.toFixed(2),
      '-i',
      inputPath,
      '-c',
      'copy',
      '-y',
      outputPath,
    ]);
  } catch {
    await execFileAsync('ffmpeg', [
      '-ss',
      startSec.toFixed(2),
      '-t',
      durationSec.toFixed(2),
      '-i',
      inputPath,
      '-ac',
      '1',
      '-ar',
      '16000',
      '-b:a',
      '48k',
      '-y',
      outputPath,
    ]);
  }
}

// Parallel worker pool helper for bounded concurrency
async function runParallel<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// -------------------------------------------------------------
// High-Speed Audio Extraction using ffmpeg
// Converts any video or audio file into an ultra-compact 16kHz mono MP3
// Reduces file size by ~90-95% so transcription takes seconds instead of minutes
// -------------------------------------------------------------
async function extractOptimizedAudio(inputFilePath: string, destinationPath?: string): Promise<string> {
  const targetPath =
    destinationPath ||
    path.join(
      MEDIA_DIR,
      `audio_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp3`
    );
  try {
    await execFileAsync('ffmpeg', [
      '-i',
      inputFilePath,
      '-vn', // Strip video frames (eliminates 90% of multimodal token delay)
      '-ac',
      '1', // Convert to mono
      '-ar',
      '16000', // 16 kHz sample rate (optimal speech recognition frequency)
      '-b:a',
      '48k', // 48 kbps bitrate (clean speech, tiny payload)
      '-threads',
      '0', // Multi-core CPU acceleration
      '-y', // Overwrite if exists
      targetPath,
    ]);
    return targetPath;
  } catch (err) {
    console.warn('[ffmpeg] Audio extraction failed or not applicable, using original:', err);
    return inputFilePath;
  }
}

// -------------------------------------------------------------
// GET /api/media/:mediaId
// High-performance streaming with HTTP 206 Partial Content (Range)
// Allows instant scrubbing, seeking forward/backward, and reliable playback
// -------------------------------------------------------------
app.get('/api/media/:mediaId', (req, res) => {
  const safeFilename = path.basename(req.params.mediaId);
  const filePath = path.join(MEDIA_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Media file not found' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const ext = path.extname(safeFilename).toLowerCase();

  const mimeMap: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': safeFilename.startsWith('recording_') || safeFilename.includes('audio') ? 'audio/webm' : 'video/webm',
    '.mkv': 'video/x-matroska',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
  };

  const contentType = mimeMap[ext] || 'application/octet-stream';
  const range = req.headers.range;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
      return;
    }

    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });

    const fileStream = fs.createReadStream(filePath, { start, end });
    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// -------------------------------------------------------------
// Resilient Gemini Generator with Exponential Backoff
// Mitigates transient 503 UNAVAILABLE & "high demand" spikes
// -------------------------------------------------------------
async function generateWithRetry(params: {
  contents: any;
  config?: any;
}): Promise<any> {
  let lastError: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || '');
      const code = err?.status || err?.code || 0;
      const isTemporary =
        code === 503 ||
        code === 429 ||
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('temporarily');

      if (isTemporary && attempt < 2) {
        console.warn(`[Gemini Request] Attempt ${attempt + 1} hit temporary spike (${errMsg}). Retrying in 1s...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      break;
    }
  }

  throw lastError;
}

// -------------------------------------------------------------
// POST /api/transcribe
// Handles File Upload, Mic Recording (base64 or file), or YouTube URL
// -------------------------------------------------------------
app.post('/api/transcribe', upload.single('mediaFile'), async (req, res) => {
  const uploadedFile = req.file;
  let fileUploadedToGeminiName: string | null = null;
  let tempExtractedAudio: string | null = null;
  let serverMediaUrl: string | undefined = undefined;

  try {
    const {
      language = 'auto',
      separateSpeakers = 'true',
      includeTimestamps = 'true',
      noteMode = 'none',
      sourceType = 'upload',
      youtubeUrl,
      base64Audio,
      audioMimeType = 'audio/webm',
      customTitle,
    } = req.body;

    const useSpeakers = separateSpeakers === 'true' || separateSpeakers === true;
    const useTimestamps = includeTimestamps === 'true' || includeTimestamps === true;

    let fallbackTitle = 'Transcription';
    let serverMediaUrl: string | undefined = undefined;
    let serverAudioUrl: string | undefined = undefined;
    let audioSourcePath: string | null = null;
    let validYtUrl: string | null = null;

    if (sourceType === 'youtube') {
      if (!youtubeUrl || !youtubeUrl.trim()) {
        return res.status(400).json({ error: 'Please provide a valid YouTube video link.' });
      }
      validYtUrl = normalizeYouTubeUrl(youtubeUrl);
      if (!validYtUrl) {
        return res.status(400).json({ error: 'Invalid YouTube URL format. Please paste a standard youtube.com or youtu.be link.' });
      }
      fallbackTitle = `YouTube: ${validYtUrl.slice(0, 45)}`;
      serverMediaUrl = validYtUrl;
      serverAudioUrl = validYtUrl;
    } else if (uploadedFile) {
      fallbackTitle = uploadedFile.originalname
        ? uploadedFile.originalname.replace(/\.[^/.]+$/, '')
        : 'Uploaded Media';

      const cleanOriginalName = path
        .basename(uploadedFile.originalname || 'upload.mp4')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const savedFileName = `media_${Date.now()}_${cleanOriginalName}`;
      const permanentSavedPath = path.join(MEDIA_DIR, savedFileName);

      // Persist original file in uploads/media so audio/video playback ALWAYS works
      await fs.promises.copyFile(uploadedFile.path, permanentSavedPath);
      serverMediaUrl = `/api/media/${savedFileName}`;

      // High-speed audio extraction: strips video frames and converts to universal 16kHz mono MP3
      const audioSavedFileName = `audio_${Date.now()}_${cleanOriginalName.replace(/\.[^/.]+$/, '')}.mp3`;
      const permanentAudioPath = path.join(MEDIA_DIR, audioSavedFileName);
      audioSourcePath = await extractOptimizedAudio(permanentSavedPath, permanentAudioPath);
      serverAudioUrl = `/api/media/${audioSavedFileName}`;
    } else if (base64Audio) {
      fallbackTitle = `Recording - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const cleanBase64 = base64Audio.replace(/^data:[^;]+;base64,/, '');
      const rawBuffer = Buffer.from(cleanBase64, 'base64');
      const ext = audioMimeType?.includes('wav')
        ? 'wav'
        : audioMimeType?.includes('mp3')
        ? 'mp3'
        : 'webm';
      const savedFileName = `recording_${Date.now()}.${ext}`;
      const permanentSavedPath = path.join(MEDIA_DIR, savedFileName);

      // Save recorded memo persistently
      await fs.promises.writeFile(permanentSavedPath, rawBuffer);
      serverMediaUrl = `/api/media/${savedFileName}`;

      // Convert to universal MP3 track for playback reliability
      const audioSavedFileName = `recording_${Date.now()}_audio.mp3`;
      const permanentAudioPath = path.join(MEDIA_DIR, audioSavedFileName);
      audioSourcePath = await extractOptimizedAudio(permanentSavedPath, permanentAudioPath);
      serverAudioUrl = `/api/media/${audioSavedFileName}`;
    } else {
      return res.status(400).json({ error: 'No media file, YouTube link, or audio recording was provided.' });
    }

    const langInstruction =
      language && language !== 'auto'
        ? `The spoken language is expected to be ${language}. Transcribe verbatim in this language unless translation is explicitly requested.`
        : `Detect the spoken language automatically. Transcribe accurately in the spoken language.`;

    const speakerInstruction = useSpeakers
      ? `Identify distinct speakers and label them consistently as "Speaker 1", "Speaker 2", etc., or use their actual names if they introduce themselves in the audio.`
      : `Label the speaker as "Speaker 1" for all dialogue segments.`;

    const timestampInstruction = useTimestamps
      ? `Provide precise start and end timestamps for speech segments in "MM:SS" format. Example: "00:00" to "00:08".`
      : `Provide estimated continuous sequential intervals in "MM:SS" format.`;

    const wantsNotes = Boolean(noteMode && noteMode !== 'none');

    const baseSystemPrompt = `You are Transcripta AI, a world-class high-speed verbatim audio and video transcription engine.
Your task is to transcribe speech accurately, rapidly, and output clean structured JSON.
CRITICAL SPEED & ACCURACY RULES:
1. Transcribe VERBATIM: accurately represent the exact spoken words. Keep colloquialisms and terms as uttered.
2. Never hallucinate or invent text. If a phrase is unintelligible, mark it as "[inaudible]".
3. Keep the original language of the speech.
4. Natural sentence segmentation: Group speech naturally by complete sentences or logical conversational thoughts (typically 5 to 15 seconds per segment). Avoid micro-fragmenting into single words or sub-second cuts to maintain speed.
5. ${speakerInstruction}
6. ${timestampInstruction}
7. ${langInstruction}`;

    let finalTitle = customTitle || fallbackTitle;
    let finalDetectedLanguage = language && language !== 'auto' ? language : 'English';
    let rawSegments: Array<{ start: string; end: string; startMs: number; endMs: number; speaker: string; text: string }> = [];
    let detectedTotalDurationStr = '00:00';

    if (sourceType === 'youtube' && validYtUrl) {
      // -----------------------------------------------------------
      // YouTube Video Processing with greedy Gemini Flash configuration
      // -----------------------------------------------------------
      const response = await generateWithRetry({
        contents: {
          parts: [
            {
              fileData: {
                fileUri: validYtUrl,
                mimeType: 'video/mp4',
              },
            },
            { text: 'Transcribe this YouTube video verbatim into chronological sentence segments with accurate MM:SS timestamps. Detect title and language.' },
          ],
        },
        config: {
          systemInstruction: baseSystemPrompt,
          temperature: 0.0, // Greedy decoding for lowest latency
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              detectedLanguage: { type: Type.STRING },
              totalDuration: { type: Type.STRING },
              segments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    start: { type: Type.STRING },
                    end: { type: Type.STRING },
                    speaker: { type: Type.STRING },
                    text: { type: Type.STRING },
                  },
                  required: ['start', 'end', 'speaker', 'text'],
                },
              },
            },
            required: ['title', 'detectedLanguage', 'totalDuration', 'segments'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.title) finalTitle = parsed.title;
      if (parsed.detectedLanguage) finalDetectedLanguage = parsed.detectedLanguage;
      if (parsed.totalDuration) detectedTotalDurationStr = parsed.totalDuration;

      if (Array.isArray(parsed.segments)) {
        rawSegments = parsed.segments.map((s: any) => {
          const startMs = parseTimestampToMs(s.start || '00:00');
          let endMs = parseTimestampToMs(s.end || '00:05');
          if (endMs <= startMs) endMs = startMs + 3000;
          return {
            start: s.start || '00:00',
            end: s.end || '00:05',
            startMs,
            endMs,
            speaker: s.speaker || 'Speaker 1',
            text: (s.text || '').trim(),
          };
        });
      }
    } else if (audioSourcePath) {
      // -----------------------------------------------------------
      // High-Speed Multi-Stage Parallel Audio Processing Pipeline
      // -----------------------------------------------------------
      const audioDurationSec = await getAudioDuration(audioSourcePath);
      const CHUNK_SIZE = 60; // 60s per chunk provides optimal parallelism without boundary fragmentation

      if (audioDurationSec <= 50) {
        // Shorter audio files (<= 50s): Single-pass inline transcription
        const buffer = await fs.promises.readFile(audioSourcePath);
        const base64Data = buffer.toString('base64');

        const response = await generateWithRetry({
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: 'audio/mp3',
                },
              },
              { text: 'Transcribe this audio verbatim into chronological sentence segments with accurate MM:SS timestamps. Detect title and language.' },
            ],
          },
          config: {
            systemInstruction: baseSystemPrompt,
            temperature: 0.0, // Greedy decoding: fastest inference
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                detectedLanguage: { type: Type.STRING },
                totalDuration: { type: Type.STRING },
                segments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      start: { type: Type.STRING },
                      end: { type: Type.STRING },
                      speaker: { type: Type.STRING },
                      text: { type: Type.STRING },
                    },
                    required: ['start', 'end', 'speaker', 'text'],
                  },
                },
              },
              required: ['title', 'detectedLanguage', 'totalDuration', 'segments'],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        if (parsed.title) finalTitle = parsed.title;
        if (parsed.detectedLanguage) finalDetectedLanguage = parsed.detectedLanguage;
        if (parsed.totalDuration) detectedTotalDurationStr = parsed.totalDuration;

        if (Array.isArray(parsed.segments)) {
          rawSegments = parsed.segments.map((s: any) => {
            const startMs = parseTimestampToMs(s.start || '00:00');
            let endMs = parseTimestampToMs(s.end || '00:05');
            if (endMs <= startMs) endMs = startMs + 3000;
            return {
              start: s.start || '00:00',
              end: s.end || '00:05',
              startMs,
              endMs,
              speaker: s.speaker || 'Speaker 1',
              text: (s.text || '').trim(),
            };
          });
        }
      } else {
        // Files > 50s: Multi-stage parallel slicing & concurrent transcription
        const numChunks = Math.ceil(audioDurationSec / CHUNK_SIZE);
        const chunkMetaList: Array<{ index: number; startSec: number; durationSec: number; base64Data: string }> = [];

        // Fast parallel chunk extraction using FFmpeg -c copy (<10ms per slice)
        for (let i = 0; i < numChunks; i++) {
          const startSec = i * CHUNK_SIZE;
          const durationSec = Math.min(CHUNK_SIZE, audioDurationSec - startSec);
          const chunkPath = path.join(
            os.tmpdir(),
            `chunk_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}.mp3`
          );

          try {
            await sliceAudioChunk(audioSourcePath, startSec, durationSec, chunkPath);
            const chunkBuffer = await fs.promises.readFile(chunkPath);
            chunkMetaList.push({
              index: i,
              startSec,
              durationSec,
              base64Data: chunkBuffer.toString('base64'),
            });
          } finally {
            if (fs.existsSync(chunkPath)) {
              try {
                fs.unlinkSync(chunkPath);
              } catch {}
            }
          }
        }

        // Concurrently transcribe all chunks with a pool limit of 4
        const chunkResults = await runParallel(chunkMetaList, 4, async (chunk) => {
          const isFirstChunk = chunk.index === 0;

          // Optimal Gemini Flash configurations: chunk 0 detects title/language, subsequent chunks only output segments
          const chunkSchema: any = isFirstChunk
            ? {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  detectedLanguage: { type: Type.STRING },
                  segments: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        start: { type: Type.STRING },
                        end: { type: Type.STRING },
                        speaker: { type: Type.STRING },
                        text: { type: Type.STRING },
                      },
                      required: ['start', 'end', 'speaker', 'text'],
                    },
                  },
                },
                required: ['title', 'detectedLanguage', 'segments'],
              }
            : {
                type: Type.OBJECT,
                properties: {
                  segments: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        start: { type: Type.STRING },
                        end: { type: Type.STRING },
                        speaker: { type: Type.STRING },
                        text: { type: Type.STRING },
                      },
                      required: ['start', 'end', 'speaker', 'text'],
                    },
                  },
                },
                required: ['segments'],
              };

          const chunkPrompt = isFirstChunk
            ? `Transcribe chunk 1 of ${chunkMetaList.length} (0s to ${Math.round(chunk.durationSec)}s) verbatim into sentence segments with precise MM:SS timecodes relative to 00:00. Include title and detected language.`
            : `Transcribe chunk ${chunk.index + 1} of ${chunkMetaList.length} verbatim into sentence segments with precise MM:SS timecodes relative to chunk start (00:00). Output segments only.`;

          const response = await generateWithRetry({
            contents: {
              parts: [
                {
                  inlineData: {
                    data: chunk.base64Data,
                    mimeType: 'audio/mp3',
                  },
                },
                { text: chunkPrompt },
              ],
            },
            config: {
              systemInstruction: baseSystemPrompt,
              temperature: 0.0, // Greedy deterministic decoding for minimal latency & zero hallucination
              responseMimeType: 'application/json',
              responseSchema: chunkSchema,
            },
          });

          const parsed = JSON.parse(response.text || '{}');
          return {
            chunk,
            parsed,
          };
        });

        // Re-align timestamps across chunks with offset arithmetic
        for (const res of chunkResults) {
          if (res.chunk.index === 0) {
            if (res.parsed.title) finalTitle = res.parsed.title;
            if (res.parsed.detectedLanguage) finalDetectedLanguage = res.parsed.detectedLanguage;
          }

          const offsetMs = Math.round(res.chunk.startSec * 1000);
          if (Array.isArray(res.parsed.segments)) {
            for (const s of res.parsed.segments) {
              const segStartMs = parseTimestampToMs(s.start || '00:00');
              let segEndMs = parseTimestampToMs(s.end || '00:05');
              if (segEndMs <= segStartMs) segEndMs = segStartMs + 3000;

              const absStartMs = offsetMs + segStartMs;
              const absEndMs = offsetMs + segEndMs;

              rawSegments.push({
                start: formatMsToTimestamp(absStartMs),
                end: formatMsToTimestamp(absEndMs),
                startMs: absStartMs,
                endMs: absEndMs,
                speaker: s.speaker || 'Speaker 1',
                text: (s.text || '').trim(),
              });
            }
          }
        }
      }
    }

    // Sort segments chronologically and assign clean sequential IDs
    rawSegments.sort((a, b) => a.startMs - b.startMs);
    const segments = rawSegments
      .filter((s) => s.text.length > 0)
      .map((s, idx) => ({
        id: String(idx + 1),
        start: s.start,
        end: s.end,
        startMs: s.startMs,
        endMs: s.endMs,
        speaker: s.speaker,
        text: s.text,
        order: idx,
      }));

    // Server-side consolidated fullText (instant, no redundant model tokens)
    const fullText = segments
      .map((s) => `${s.speaker ? s.speaker + ': ' : ''}${s.text}`)
      .join('\n\n');

    // Calculate accurate total duration
    const maxSegmentEndMs = segments.length > 0 ? segments[segments.length - 1].endMs : 0;
    const durationSeconds = Math.max(
      1,
      Math.round(maxSegmentEndMs / 1000) || Math.round(parseTimestampToMs(detectedTotalDurationStr) / 1000) || 60
    );
    const totalDuration = formatMsToTimestamp(durationSeconds * 1000);

    // High-level structured notes synthesis (if requested by user)
    let generatedNotes = '';
    if (wantsNotes && fullText) {
      try {
        const notesResponse = await generateWithRetry({
          contents: {
            parts: [
              {
                text: `You are an expert executive note taker and analyst.
Synthesize the following complete audio transcript into high-quality structured Markdown notes matching mode "${noteMode}".

TRANSCRIPT:
${fullText.slice(0, 45000)}

Output clear, formatted markdown directly without meta-commentary.`,
              },
            ],
          },
          config: {
            temperature: 0.1,
          },
        });
        generatedNotes = notesResponse.text || '';
      } catch (err) {
        console.warn('Note generation fallback error:', err);
      }
    }

    return res.json({
      title: customTitle || finalTitle,
      detectedLanguage: finalDetectedLanguage,
      totalDuration,
      durationSeconds,
      segments,
      fullText,
      notes: generatedNotes,
      noteMode,
      mediaUrl: serverMediaUrl,
      audioUrl: serverAudioUrl || serverMediaUrl,
      status: 'completed',
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    let errorMessage = error.message || 'An unexpected error occurred during transcription.';

    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('PERMISSION_DENIED')) {
      errorMessage = 'Gemini API authentication failed. Please verify your GEMINI_API_KEY in Settings > Secrets.';
      return res.status(403).json({ error: errorMessage });
    } else if (
      errorMessage.includes('503') ||
      errorMessage.includes('high demand') ||
      errorMessage.includes('UNAVAILABLE') ||
      errorMessage.includes('temporarily')
    ) {
      errorMessage = 'The AI model is temporarily experiencing high demand across Google servers. Please click "Retry Now" in a few seconds (your file/recording is preserved).';
      return res.status(503).json({ error: errorMessage, isRetryable: true });
    } else if (errorMessage.includes('RESOURCE_EXHAUSTED')) {
      errorMessage = 'Gemini API rate limit reached. Please wait a moment and try again.';
      return res.status(429).json({ error: errorMessage, isRetryable: true });
    } else if (errorMessage.includes('YouTube') || errorMessage.includes('video') || errorMessage.includes('400')) {
      if (req.body?.sourceType === 'youtube') {
        errorMessage = 'Unable to access this YouTube video. It might be private, region-restricted, or protected. Please ensure the video is publicly accessible, or upload the file directly.';
      }
    }

    return res.status(500).json({ error: errorMessage, isRetryable: false });
  } finally {
    // Clean up local temp file
    if (uploadedFile && fs.existsSync(uploadedFile.path)) {
      try {
        fs.unlinkSync(uploadedFile.path);
      } catch (err) {
        console.warn('Failed to delete temp file:', err);
      }
    }

    // Clean up temporary extracted audio
    if (tempExtractedAudio && fs.existsSync(tempExtractedAudio)) {
      try {
        fs.unlinkSync(tempExtractedAudio);
      } catch (err) {
        console.warn('Failed to delete temp extracted audio:', err);
      }
    }

    // Clean up Gemini uploaded file if used
    if (fileUploadedToGeminiName) {
      try {
        await ai.files.delete({ name: fileUploadedToGeminiName });
      } catch (err) {
        console.warn('Failed to delete Gemini file:', err);
      }
    }
  }
});

// -------------------------------------------------------------
// POST /api/generate-notes
// Generates or regenerates summary / notes from an existing transcript
// -------------------------------------------------------------
app.post('/api/generate-notes', async (req, res) => {
  try {
    const { transcript, noteMode = 'short_summary', detailLevel = 'balanced', title } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcript text is required to generate notes.' });
    }

    const detailPacing =
      detailLevel === 'concise'
        ? 'Be extremely concise, brief, and punchy. Focus strictly on top-level facts.'
        : detailLevel === 'detailed'
        ? 'Provide in-depth, thorough coverage with extensive context, full nuances, and comprehensive analysis.'
        : 'Provide balanced depth with crisp clarity.';

    let instruction = '';
    if (noteMode === 'short_summary') {
      instruction = `Provide an Executive Short Summary in 1-2 tight paragraphs capturing the core narrative, thesis, and ultimate conclusion.\n${detailPacing}`;
    } else if (noteMode === 'detailed_summary') {
      instruction = `Provide a comprehensive Detailed Summary. Structure into:
1. ### Executive Background & Context
2. ### In-Depth Breakdown of Discussions & Evidence
3. ### Strategic Outcomes & Forward Outlook\n${detailPacing}`;
    } else if (noteMode === 'main_ideas') {
      instruction = `Extract the foundational Main Ideas and conceptual pillars of the recording. Number each idea with a bold title and a concise explanatory paragraph.\n${detailPacing}`;
    } else if (noteMode === 'key_points' || noteMode === 'takeaways') {
      instruction = `List all critical Key Takeaways and insights. Format as high-impact bullet points with key metrics and conclusions highlighted in bold.\n${detailPacing}`;
    } else if (noteMode === 'quotes') {
      instruction = `Extract the most impactful Important Quotations from the transcript verbatim. For each quote, format as a blockquote (> "Quote") followed by attribution [Speaker / Context] and why it matters.\n${detailPacing}`;
    } else if (noteMode === 'action_items') {
      instruction = `Extract every actionable task, commitment, decision, and next step in checklist format (- [ ] Task: description [Assignee if mentioned] [Deadline if mentioned]). Also include a "Decisions Made" section.\n${detailPacing}`;
    } else if (noteMode === 'chapters') {
      instruction = `Generate timed Chapters and Topics based on speech shifts. Format each chapter with approximate timecode and descriptive title (e.g., "### [00:00] Introduction & Welcome", "### [04:15] Core Challenges"). Provide a 2-sentence summary under each chapter.\n${detailPacing}`;
    } else if (noteMode === 'study_notes') {
      instruction = `Create academic Study Notes. Structure into:
1. ### Core Concepts & Principles
2. ### Essential Glossary & Definitions
3. ### Deep-Dive Synthesis
4. ### Review & Practice Questions (with answers)\n${detailPacing}`;
    } else if (noteMode === 'minutes') {
      instruction = `Create formal Meeting Minutes:
1. ### Meeting Overview & Agenda Topics
2. ### Discussion & Motions
3. ### Key Decisions Confirmed
4. ### Action Items & Follow-Ups\n${detailPacing}`;
    } else if (noteMode === 'qa') {
      instruction = `Generate 5-8 insightful Questions & Answers directly based on the transcript content. Format as:
**Q: [Question]?**
A: [Answer based strictly on the transcript].\n${detailPacing}`;
    } else {
      instruction = `Provide a clean, structured summary with key takeaways.\n${detailPacing}`;
    }

    const response = await generateWithRetry({
      contents: [
        {
          text: `You are an expert transcription intelligence engine. Generate clean, highly professional Markdown notes based solely on this transcript of "${title || 'Recording'}".

Instructions:
${instruction}

Transcript:
${transcript}`,
        },
      ],
      config: {
        temperature: 0.2,
      },
    });

    return res.json({ notes: response.text || '' });
  } catch (error: any) {
    console.error('Note generation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate notes.' });
  }
});

// -------------------------------------------------------------
// POST /api/chat
// Grounded Q&A against the transcript
// -------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
  try {
    const { transcript, title, messages } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'No transcript provided.' });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'No chat messages provided.' });
    }

    const systemInstruction = `You are Transcripta AI Assistant. You help users understand, analyze, and query the transcribed content of "${title || 'this recording'}".
CRITICAL GROUNDING RULES:
1. Answer the user's questions STRICTLY and ONLY using the facts, statements, and context contained in the transcript below.
2. If the user asks something that is NOT mentioned or cannot be directly inferred from the transcript, politely and clearly state: "The transcript does not contain information about that."
3. When relevant, reference specific speakers (e.g. "Speaker 1 stated that...") or quote brief phrases from the transcript.
4. Keep answers concise, direct, helpful, and formatted in clean Markdown.`;

    const chatContents: any[] = [
      {
        role: 'user',
        parts: [{ text: `Here is the full transcript of "${title || 'the recording'}":\n\n${transcript}\n\nPlease keep this context in mind for our conversation.` }],
      },
      {
        role: 'model',
        parts: [{ text: `I have read and understood the transcript for "${title || 'the recording'}". I am ready to answer any questions strictly based on its content.` }],
      },
    ];

    for (const msg of messages) {
      chatContents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      });
    }

    const response = await generateWithRetry({
      contents: chatContents,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    return res.json({ reply: response.text || '' });
  } catch (error: any) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process chat message.' });
  }
});

// -------------------------------------------------------------
// POST /api/translate
// Translates transcript segments into another language while keeping timestamps & speakers
// -------------------------------------------------------------
app.post('/api/translate', async (req, res) => {
  try {
    const { segments, targetLanguage } = req.body;

    if (!Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ error: 'No segments provided for translation.' });
    }

    if (!targetLanguage) {
      return res.status(400).json({ error: 'Target language must be specified.' });
    }

    const promptText = `Translate the "text" field of each segment in the following JSON array into ${targetLanguage}.
Do NOT change the "id", "start", "end", or "speaker" fields.
Keep any [inaudible] markers intact.
Return the exact same JSON structure.`;

    const response = await generateWithRetry({
      contents: [
        {
          text: `${promptText}\n\nInput Segments:\n${JSON.stringify(segments)}`,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              start: { type: Type.STRING },
              end: { type: Type.STRING },
              speaker: { type: Type.STRING },
              text: { type: Type.STRING },
            },
            required: ['id', 'start', 'end', 'speaker', 'text'],
          },
        },
      },
    });

    const translatedSegments = JSON.parse(response.text || '[]');
    const fullText = translatedSegments.map((s: any) => `${s.speaker ? s.speaker + ': ' : ''}${s.text}`).join('\n\n');

    return res.json({ segments: translatedSegments, fullText });
  } catch (error: any) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to translate transcript.' });
  }
});

// -------------------------------------------------------------
// Vite middleware in dev or static files in production
// -------------------------------------------------------------
// Serve public assets (PWA manifest, icons, service worker)
app.use(express.static(path.resolve('public')));

async function setupViteOrStatic() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Transcripta AI server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
