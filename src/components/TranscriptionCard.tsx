import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Youtube,
  Mic,
  Settings2,
  ChevronDown,
  ChevronUp,
  FileAudio,
  FileVideo,
  X,
  AlertTriangle,
  Play,
  Pause,
  Square,
  Sparkles,
  Loader2,
  ShieldCheck,
  Check,
  ExternalLink,
} from 'lucide-react';
import { NoteMode, SUPPORTED_LANGUAGES, TranscriptRecord } from '../types';
import { TranscriptionToast, TranscriptionStage } from './TranscriptionToast';

interface TranscriptionCardProps {
  onTranscriptionSuccess: (record: TranscriptRecord) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

export const TranscriptionCard: React.FC<TranscriptionCardProps> = ({
  onTranscriptionSuccess,
  isLoading,
  setIsLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'youtube' | 'record'>('upload');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // YouTube Link State
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Advanced Settings State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [separateSpeakers, setSeparateSpeakers] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [noteMode, setNoteMode] = useState<NoteMode>('none');
  const [transcriptionStage, setTranscriptionStage] = useState<TranscriptionStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Progress message state
  const [loadingStep, setLoadingStep] = useState('Preparing media...');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetryableError, setIsRetryableError] = useState(false);

  // Clean up recorded audio url
  useEffect(() => {
    return () => {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [recordedAudioUrl]);

  // Loading step and elapsed timer when transcribing
  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      return;
    }
    const steps = [
      'Sending media to Gemini Flash...',
      'Analyzing acoustic speech frequencies...',
      'Separating speakers & diarizing dialog...',
      'Aligning word-level timestamps...',
      'Finalizing verbatim subtitle transcript...',
    ];
    let idx = 0;
    setLoadingStep(steps[0]);

    const stepInterval = setInterval(() => {
      idx = (idx + 1) % steps.length;
      setLoadingStep(steps[idx]);
    }, 1800);

    const timerInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(stepInterval);
      clearInterval(timerInterval);
    };
  }, [isLoading]);

  // -------------------------------------------------------------
  // File Upload Handlers
  // -------------------------------------------------------------
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    setErrorMessage(null);
    const validExtensions = ['.mp4', '.mov', '.mp3', '.wav', '.m4a', '.webm', '.aac', '.ogg'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => lowerName.endsWith(ext)) || file.type.startsWith('audio/') || file.type.startsWith('video/');

    if (!isValid) {
      setErrorMessage('Unsupported file format. Please upload MP4, MOV, MP3, WAV, M4A, or WebM.');
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setErrorMessage('File size exceeds 200MB limit. Please select a shorter clip or compress the audio.');
      return;
    }

    setSelectedFile(file);
  };

  // -------------------------------------------------------------
  // Microphone Recording Handlers
  // -------------------------------------------------------------
  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Audio analysis for live visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      // Canvas visualizer loop
      drawWaveform();

      // MediaRecorder setup
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(URL.createObjectURL(audioBlob));

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      setRecordDuration(0);
      setRecordedAudioBlob(null);

      timerIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Mic access error:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access in your browser to record audio.'
          : 'Unable to access your microphone. Please check your system audio settings.'
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const discardRecording = () => {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordDuration(0);
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / (bufferLength / 1.5)) * 1.8;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.85;

        // Gradient from cyan to teal
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#06b6d4');
        gradient.addColorStop(1, '#0d9488');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, 2);
        ctx.fill();

        x += barWidth;
      }
    };

    render();
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // Helper to execute request with real upload progress tracking
  // -------------------------------------------------------------
  const executeTranscribeRequest = (
    body: FormData | string,
    isJson: boolean,
    onProgress: (pct: number) => void
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/transcribe', true);
      if (isJson) {
        xhr.setRequestHeader('Content-Type', 'application/json');
      }

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          onProgress(pct);
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            const err: any = new Error(data.error || `Server error (${xhr.status})`);
            err.data = data;
            err.status = xhr.status;
            reject(err);
          }
        } catch {
          reject(new Error(`Failed to parse response from server (${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload. Please check your connection.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Transcription request timed out. Please try a shorter clip or compress audio.'));
      };

      xhr.timeout = 180000; // 3 minute timeout
      xhr.send(body);
    });
  };

  // -------------------------------------------------------------
  // Transcribe Submit Handler
  // -------------------------------------------------------------
  const handleTranscribe = async () => {
    setErrorMessage(null);

    // Validation
    if (activeTab === 'upload' && !selectedFile) {
      setErrorMessage('Please select or drag an audio or video file to transcribe.');
      return;
    }
    if (activeTab === 'youtube' && (!youtubeUrl || !youtubeUrl.trim())) {
      setErrorMessage('Please enter a YouTube video URL.');
      return;
    }
    if (activeTab === 'record' && !recordedAudioBlob) {
      setErrorMessage('Please record some audio before clicking Transcribe.');
      return;
    }

    setIsLoading(true);
    setTranscriptionStage('uploading');
    setUploadProgress(0);
    setLoadingStep('Uploading media to server...');

    // Timers for smooth stage transitions matching the backend pipeline
    const t1 = setTimeout(() => {
      setTranscriptionStage('processing_audio');
      setLoadingStep('Processing audio track (FFmpeg fast pass)...');
    }, 1800);

    const t2 = setTimeout(() => {
      setTranscriptionStage('generating_transcript');
      setLoadingStep('Transcribing speech verbatim with Gemini Flash...');
    }, 4500);

    const t3 = setTimeout(() => {
      setTranscriptionStage('aligning_timestamps');
      setLoadingStep('Aligning word timestamps & separating speakers...');
    }, 9000);

    const t4 = setTimeout(() => {
      setTranscriptionStage('finalizing');
      setLoadingStep('Finalizing transcript & preparing playback...');
    }, 15000);

    try {
      let data: any;

      if (activeTab === 'upload' && selectedFile) {
        const formData = new FormData();
        formData.append('mediaFile', selectedFile);
        formData.append('language', selectedLanguage);
        formData.append('separateSpeakers', String(separateSpeakers));
        formData.append('includeTimestamps', String(includeTimestamps));
        formData.append('noteMode', noteMode);
        formData.append('sourceType', 'upload');
        formData.append('customTitle', selectedFile.name.replace(/\.[^/.]+$/, ''));

        data = await executeTranscribeRequest(formData, false, (pct) => {
          setUploadProgress(pct);
          if (pct >= 100) {
            setTranscriptionStage('processing_audio');
            setLoadingStep('Extracting audio track (FFmpeg pass)...');
          }
        });
      } else if (activeTab === 'youtube') {
        setUploadProgress(100);
        setTranscriptionStage('processing_audio');
        data = await executeTranscribeRequest(
          JSON.stringify({
            sourceType: 'youtube',
            youtubeUrl: youtubeUrl.trim(),
            language: selectedLanguage,
            separateSpeakers,
            includeTimestamps,
            noteMode,
          }),
          true,
          () => {}
        );
      } else {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(recordedAudioBlob!);
        });
        const base64Data = await base64Promise;

        data = await executeTranscribeRequest(
          JSON.stringify({
            sourceType: 'record',
            base64Audio: base64Data,
            audioMimeType: recordedAudioBlob!.type || 'audio/webm',
            language: selectedLanguage,
            separateSpeakers,
            includeTimestamps,
            noteMode,
            customTitle: `Voice Memo - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          }),
          true,
          (pct) => setUploadProgress(pct)
        );
      }

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setTranscriptionStage('finalizing');

      const localBlobUrl = selectedFile
        ? URL.createObjectURL(selectedFile)
        : recordedAudioBlob
        ? URL.createObjectURL(recordedAudioBlob)
        : undefined;

      const newRecord: TranscriptRecord = {
        id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: data.title || (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'Untitled Transcript'),
        createdAt: data.createdAt || new Date().toISOString(),
        duration: data.totalDuration || '00:00',
        durationSeconds:
          data.durationSeconds ||
          (data.segments?.length ? Math.round(data.segments[data.segments.length - 1].endMs / 1000) : 60),
        language: data.detectedLanguage || selectedLanguage,
        segments: data.segments || [],
        fullText: data.fullText || '',
        notes: data.notes || '',
        noteMode: noteMode,
        sourceType: activeTab,
        fileName: selectedFile?.name,
        fileSize: selectedFile?.size,
        fileFormat: selectedFile?.type,
        mediaUrl: data.mediaUrl || localBlobUrl,
        audioUrl: data.audioUrl || data.mediaUrl || localBlobUrl,
        youtubeUrl: activeTab === 'youtube' ? youtubeUrl.trim() : undefined,
        status: 'completed',
      };

      setTranscriptionStage('completed');
      setTimeout(() => {
        onTranscriptionSuccess(newRecord);
        setIsLoading(false);
      }, 700);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setTranscriptionStage('error');
      console.error('Transcription error:', err);
      const msg = err.message || err.data?.error || 'Something went wrong while processing your media.';
      const isDemand =
        msg.includes('demand') ||
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('temporarily') ||
        msg.includes('limit');
      if (isDemand) {
        setIsRetryableError(true);
      }
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <div id="transcribe" className="w-full max-w-4xl mx-auto">
      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all">
        {/* Three Tab Selectors */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-1.5 gap-1 sm:gap-1.5">
          <button
            onClick={() => {
              setActiveTab('upload');
              setErrorMessage(null);
            }}
            disabled={isLoading}
            className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span className="truncate">Upload File</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('youtube');
              setErrorMessage(null);
            }}
            disabled={isLoading}
            className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
              activeTab === 'youtube'
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Youtube className="w-4 h-4 text-red-500 shrink-0" />
            <span className="truncate">YouTube</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('record');
              setErrorMessage(null);
            }}
            disabled={isLoading}
            className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
              activeTab === 'record'
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">Record Voice</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="p-6 sm:p-8">
          {/* TAB 1: UPLOAD */}
          {activeTab === 'upload' && (
            <div>
              {!selectedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-500 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="audio/*,video/*,.mp4,.mov,.mp3,.wav,.m4a,.webm,.aac,.ogg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelection(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-inner">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    Drop your audio or video file here
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    or <span className="text-cyan-600 dark:text-cyan-400 font-medium underline">browse from your computer</span>
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                    <span>MP4</span>
                    <span aria-hidden="true">·</span>
                    <span>MOV</span>
                    <span aria-hidden="true">·</span>
                    <span>MP3</span>
                    <span aria-hidden="true">·</span>
                    <span>WAV</span>
                    <span aria-hidden="true">·</span>
                    <span>M4A</span>
                    <span aria-hidden="true">·</span>
                    <span>WebM</span>
                    <span aria-hidden="true">·</span>
                    <span>Max 200MB</span>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/60 dark:bg-slate-800/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                        {selectedFile.type.startsWith('video/') ? (
                          <FileVideo className="w-6 h-6" />
                        ) : (
                          <FileAudio className="w-6 h-6" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-sm sm:max-w-md">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.type || 'Media File'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Warning if file is large */}
                  {selectedFile.size > 140 * 1024 * 1024 && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <span>
                        This is a large media file ({(selectedFile.size / (1024 * 1024)).toFixed(0)}MB). For faster transcription and lower latency, consider extracting the audio track or using a shorter clip.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: YOUTUBE LINK */}
          {activeTab === 'youtube' && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                YouTube Video URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    setErrorMessage(null);
                  }}
                  disabled={isLoading}
                  className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all pr-20"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setYoutubeUrl(text);
                    } catch {
                      // clipboard access blocked
                    }
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Paste
                </button>
              </div>

              <div className="p-3 bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-900/40 rounded-xl text-xs text-cyan-800 dark:text-cyan-300 flex items-start gap-2.5">
                <Youtube className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>
                  Transcripta AI processes public YouTube videos directly using Gemini’s native video analysis. Ensure the video is public and unrestricted.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: RECORD MICROPHONE */}
          {activeTab === 'record' && (
            <div className="text-center py-4">
              {!recordedAudioBlob ? (
                <div className="space-y-6">
                  {/* Visualizer canvas */}
                  <div className="h-24 w-full max-w-md mx-auto bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center p-2 relative">
                    {isRecording ? (
                      <canvas ref={canvasRef} width={400} height={80} className="w-full h-full" />
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Mic className="w-4 h-4 text-slate-400" />
                        <span>Ready to record from your microphone</span>
                      </div>
                    )}
                  </div>

                  {/* Timer display */}
                  <div className="font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                    {formatTimer(recordDuration)}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-3">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={isLoading}
                        className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm flex items-center gap-2 shadow-sm shadow-cyan-600/30 transition-all hover:scale-105"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Start Recording</span>
                      </button>
                    ) : (
                      <>
                        {isPaused ? (
                          <button
                            onClick={resumeRecording}
                            className="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white transition-all"
                            title="Resume"
                          >
                            <Play className="w-5 h-5 fill-current" />
                          </button>
                        ) : (
                          <button
                            onClick={pauseRecording}
                            className="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white transition-all"
                            title="Pause"
                          >
                            <Pause className="w-5 h-5 fill-current" />
                          </button>
                        )}

                        <button
                          onClick={stopRecording}
                          className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm flex items-center gap-2 shadow-sm shadow-red-600/20 transition-all"
                        >
                          <Square className="w-4 h-4 fill-current" />
                          <span>Stop & Review</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-md mx-auto p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Recording captured</span>
                    <span className="font-mono tabular-nums">{formatTimer(recordDuration)}</span>
                  </div>

                  {recordedAudioUrl && (
                    <audio src={recordedAudioUrl} controls className="w-full h-10 outline-none" />
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={discardRecording}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Record Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Advanced Settings Accordion */}
          <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Advanced Settings</span>
              </div>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/70 dark:border-slate-800/70">
                {/* 1. Language Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Audio Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    disabled={isLoading}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} {lang.nativeName ? `(${lang.nativeName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Note Mode Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Note Mode
                  </label>
                  <select
                    value={noteMode}
                    onChange={(e) => setNoteMode(e.target.value as NoteMode)}
                    disabled={isLoading}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="none">Fast Transcript Only (Default · Fastest)</option>
                    <option value="smart_summary">Smart Summary (Overview + Key Bullets)</option>
                    <option value="short_summary">Executive Short Summary (1-2 tight paragraphs)</option>
                    <option value="detailed_summary">Detailed Breakdown (Context, Evidence & Outlook)</option>
                    <option value="main_ideas">Main Ideas & Conceptual Pillars</option>
                    <option value="key_points">Key Points & Metric Highlights</option>
                    <option value="action_items">Action Items (Tasks, Assignees & Next Steps)</option>
                    <option value="study_notes">Study Notes (Definitions, Concepts & Review)</option>
                  </select>
                </div>

                {/* 3. Separate Speakers Toggle */}
                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Separate Speakers
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Label voices as Speaker 1, Speaker 2
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSeparateSpeakers(!separateSpeakers)}
                    disabled={isLoading}
                    className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                      separateSpeakers ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        separateSpeakers ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Include Timestamps Toggle */}
                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Include Timestamps
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Format interval marks ([00:00])
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncludeTimestamps(!includeTimestamps)}
                    disabled={isLoading}
                    className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                      includeTimestamps ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        includeTimestamps ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl space-y-3">
              <div className="flex items-start gap-3 text-xs text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-red-400 hover:text-red-700 dark:hover:text-red-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isRetryableError && (
                <div className="flex items-center justify-between pt-2 border-t border-red-200/60 dark:border-red-900/40">
                  <span className="text-[11px] text-red-600 dark:text-red-400">
                    Your file/recording is preserved.
                  </span>
                  <button
                    onClick={handleTranscribe}
                    disabled={isLoading}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>Retry Now</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Transcription Status Bar (In-Card Stage Monitor) */}
          {isLoading && (
            <div className="mt-5 p-4 rounded-xl bg-slate-900 border border-cyan-500/30 text-white space-y-3 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="font-semibold text-cyan-300">Live Transcription Status</span>
                </div>
                <span className="font-mono text-cyan-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  Elapsed: {elapsedSeconds}s
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 via-teal-400 to-amber-400 h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${
                      transcriptionStage === 'uploading'
                        ? Math.max(10, uploadProgress > 0 ? uploadProgress * 0.35 : 20)
                        : transcriptionStage === 'processing_audio'
                        ? 45
                        : transcriptionStage === 'generating_transcript'
                        ? 70
                        : transcriptionStage === 'aligning_timestamps'
                        ? 88
                        : transcriptionStage === 'finalizing'
                        ? 96
                        : 100
                    }%`,
                  }}
                />
              </div>

              {/* Current Step Description */}
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium text-white flex items-center gap-1.5 truncate mr-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
                  <span className="truncate">{loadingStep}</span>
                </span>
                {transcriptionStage === 'uploading' && uploadProgress > 0 && (
                  <span className="font-mono text-cyan-400 text-[11px] shrink-0">{uploadProgress}%</span>
                )}
              </div>

              {/* 5-Stage Step Indicators */}
              <div className="grid grid-cols-5 gap-1 pt-1 text-center text-[10px]">
                <div
                  className={`py-1 rounded transition-colors ${
                    transcriptionStage === 'uploading'
                      ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-400/30'
                      : 'text-slate-500'
                  }`}
                >
                  1. Upload
                </div>
                <div
                  className={`py-1 rounded transition-colors ${
                    transcriptionStage === 'processing_audio'
                      ? 'bg-teal-500/25 text-teal-300 font-bold border border-teal-400/30'
                      : 'text-slate-500'
                  }`}
                >
                  2. Audio
                </div>
                <div
                  className={`py-1 rounded transition-colors ${
                    transcriptionStage === 'generating_transcript'
                      ? 'bg-amber-500/25 text-amber-300 font-bold border border-amber-400/30'
                      : 'text-slate-500'
                  }`}
                >
                  3. Gemini AI
                </div>
                <div
                  className={`py-1 rounded transition-colors ${
                    transcriptionStage === 'aligning_timestamps'
                      ? 'bg-blue-500/25 text-blue-300 font-bold border border-blue-400/30'
                      : 'text-slate-500'
                  }`}
                >
                  4. Diarize
                </div>
                <div
                  className={`py-1 rounded transition-colors ${
                    transcriptionStage === 'finalizing' || transcriptionStage === 'completed'
                      ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-400/30'
                      : 'text-slate-500'
                  }`}
                >
                  5. Ready
                </div>
              </div>
            </div>
          )}

          {/* Transcribe Button */}
          <div className="mt-6">
            <button
              onClick={handleTranscribe}
              disabled={isLoading}
              className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2.5 transition-all shadow-md ${
                isLoading
                  ? 'bg-cyan-700 cursor-not-allowed opacity-90'
                  : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/25 hover:shadow-cyan-600/40 active:scale-[0.99]'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{loadingStep}</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-400/30 text-cyan-200">
                    {elapsedSeconds}s
                  </span>
                </div>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Transcribe Free with Gemini Flash</span>
                </>
              )}
            </button>
          </div>

          {/* Privacy Note */}
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Privacy guaranteed: Your media is processed securely with Google&apos;s Gemini API.</span>
          </div>
        </div>
      </div>

      {/* Floating Status Bar / Toast Notification */}
      <TranscriptionToast
        stage={transcriptionStage}
        progressPercent={uploadProgress}
        elapsedSeconds={elapsedSeconds}
        errorMessage={errorMessage}
        onRetry={handleTranscribe}
        onDismiss={() => setTranscriptionStage('idle')}
        mediaName={selectedFile?.name || (activeTab === 'youtube' ? 'YouTube Video' : 'Voice Memo')}
      />
    </div>
  );
};
