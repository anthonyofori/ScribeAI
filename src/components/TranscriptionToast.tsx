import React, { useState, useEffect } from 'react';
import {
  Loader2,
  Upload,
  AudioWaveform,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export type TranscriptionStage =
  | 'idle'
  | 'uploading'
  | 'processing_audio'
  | 'generating_transcript'
  | 'aligning_timestamps'
  | 'finalizing'
  | 'completed'
  | 'error';

export interface TranscriptionToastProps {
  stage: TranscriptionStage;
  progressPercent?: number;
  elapsedSeconds: number;
  errorMessage?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  mediaName?: string;
}

const STAGE_CONFIG: Record<
  TranscriptionStage,
  {
    stepNumber: number;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    estimatedTotalSeconds: number;
  }
> = {
  idle: {
    stepNumber: 0,
    title: 'Ready',
    description: 'Awaiting media input',
    icon: Sparkles,
    accentColor: 'text-slate-400',
    estimatedTotalSeconds: 30,
  },
  uploading: {
    stepNumber: 1,
    title: 'Uploading media...',
    description: 'Streaming raw audio/video payload to server',
    icon: Upload,
    accentColor: 'text-cyan-500',
    estimatedTotalSeconds: 20,
  },
  processing_audio: {
    stepNumber: 2,
    title: 'Processing audio track...',
    description: 'Extracting speech acoustic track with FFmpeg (16kHz mono pass)',
    icon: AudioWaveform,
    accentColor: 'text-teal-400',
    estimatedTotalSeconds: 22,
  },
  generating_transcript: {
    stepNumber: 3,
    title: 'Generating transcript...',
    description: 'Gemini Flash AI is transcribing speech verbatim with high precision',
    icon: Sparkles,
    accentColor: 'text-amber-400',
    estimatedTotalSeconds: 25,
  },
  aligning_timestamps: {
    stepNumber: 4,
    title: 'Aligning timestamps & speakers...',
    description: 'Diarizing distinct speakers and structuring word-level intervals',
    icon: FileText,
    accentColor: 'text-blue-400',
    estimatedTotalSeconds: 28,
  },
  finalizing: {
    stepNumber: 5,
    title: 'Finalizing playback workspace...',
    description: 'Preparing persistent media stream and subtitle tracks',
    icon: Loader2,
    accentColor: 'text-emerald-400',
    estimatedTotalSeconds: 30,
  },
  completed: {
    stepNumber: 5,
    title: 'Transcription Complete!',
    description: 'Opening interactive workspace and synchronizer...',
    icon: CheckCircle2,
    accentColor: 'text-emerald-400',
    estimatedTotalSeconds: 30,
  },
  error: {
    stepNumber: 0,
    title: 'Transcription Interrupted',
    description: 'An error occurred during speech recognition',
    icon: AlertTriangle,
    accentColor: 'text-red-400',
    estimatedTotalSeconds: 0,
  },
};

const STAGES_ORDER: TranscriptionStage[] = [
  'uploading',
  'processing_audio',
  'generating_transcript',
  'aligning_timestamps',
  'finalizing',
];

export const TranscriptionToast: React.FC<TranscriptionToastProps> = ({
  stage,
  progressPercent = 0,
  elapsedSeconds,
  errorMessage,
  onRetry,
  onDismiss,
  mediaName,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // If idle, don't show toast
  if (stage === 'idle') return null;

  const currentConfig = STAGE_CONFIG[stage] || STAGE_CONFIG.uploading;
  const IconComponent = currentConfig.icon;

  // Compute calculated progress bar value (0-100)
  let computedPercent = 0;
  if (stage === 'uploading') {
    computedPercent = Math.max(5, Math.min(30, progressPercent > 0 ? progressPercent * 0.3 : 15));
  } else if (stage === 'processing_audio') {
    computedPercent = 40;
  } else if (stage === 'generating_transcript') {
    computedPercent = 65;
  } else if (stage === 'aligning_timestamps') {
    computedPercent = 85;
  } else if (stage === 'finalizing') {
    computedPercent = 95;
  } else if (stage === 'completed') {
    computedPercent = 100;
  }

  // Format seconds into MM:SS or Xs
  const formatSeconds = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <aside
      aria-live="polite"
      aria-label="Transcription progress notification"
      className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-none sm:max-w-md w-auto sm:w-[420px] transition-all duration-300 transform translate-y-0"
    >
      <div
        className={`rounded-2xl border shadow-2xl backdrop-blur-md overflow-hidden transition-all ${
          stage === 'error'
            ? 'bg-slate-900/95 border-red-500/50 shadow-red-950/40 text-white'
            : stage === 'completed'
            ? 'bg-slate-900/95 border-emerald-500/50 shadow-emerald-950/40 text-white'
            : 'bg-slate-900/95 border-cyan-500/40 shadow-cyan-950/40 text-white'
        }`}
      >
        {/* Top Progress bar line */}
        {stage !== 'error' && (
          <div className="w-full bg-slate-800 h-1.5 relative overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                stage === 'completed'
                  ? 'bg-emerald-400'
                  : 'bg-gradient-to-r from-cyan-500 via-teal-400 to-amber-400'
              }`}
              style={{ width: `${computedPercent}%` }}
            />
          </div>
        )}

        <div className="p-4 sm:p-4.5 space-y-3">
          {/* Header Row: Stage Badge + Elapsed + Collapse/Dismiss */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-2 w-2 rounded-full ${
                  stage === 'error'
                    ? 'bg-red-400'
                    : stage === 'completed'
                    ? 'bg-emerald-400'
                    : 'bg-cyan-400 animate-ping'
                }`}
              />
              <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-300 font-mono">
                {stage === 'error'
                  ? 'Process Paused'
                  : stage === 'completed'
                  ? 'Success'
                  : 'Transcription Engine Active'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-[11px] text-slate-300 flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>{formatSeconds(elapsedSeconds)}</span>
              </span>

              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isCollapsed ? 'Expand details' : 'Collapse'}
                aria-label={isCollapsed ? 'Expand notification details' : 'Collapse notification'}
              >
                {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {(stage === 'completed' || stage === 'error') && onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Dismiss notification"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Main Stage Information */}
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                stage === 'error'
                  ? 'bg-red-950/60 border-red-500/40 text-red-400'
                  : stage === 'completed'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                  : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400'
              }`}
            >
              <IconComponent
                className={`w-5 h-5 ${
                  stage !== 'error' && stage !== 'completed' && stage !== 'uploading'
                    ? 'animate-spin'
                    : ''
                }`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>{currentConfig.title}</span>
                {stage === 'uploading' && progressPercent > 0 && (
                  <span className="text-xs font-mono text-cyan-300 font-normal">
                    ({progressPercent}%)
                  </span>
                )}
              </h4>

              <p className="text-xs text-slate-300 mt-0.5 leading-snug line-clamp-2">
                {stage === 'error'
                  ? errorMessage || currentConfig.description
                  : currentConfig.description}
              </p>

              {mediaName && (
                <p className="text-[11px] text-slate-400 truncate mt-1 flex items-center gap-1 font-mono">
                  <span className="text-slate-500">File:</span> {mediaName}
                </p>
              )}
            </div>
          </div>

          {/* Expandable Multi-Stage Stepper View */}
          {!isCollapsed && stage !== 'error' && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {STAGES_ORDER.map((s, idx) => {
                  const cfg = STAGE_CONFIG[s];
                  const isCurrent = stage === s;
                  const isPassed =
                    currentConfig.stepNumber > cfg.stepNumber || stage === 'completed';

                  return (
                    <div key={s} className="space-y-1">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          isPassed
                            ? 'bg-emerald-400'
                            : isCurrent
                            ? 'bg-cyan-400 animate-pulse'
                            : 'bg-slate-800'
                        }`}
                      />
                      <span
                        className={`block text-[9px] truncate font-medium ${
                          isPassed
                            ? 'text-emerald-300'
                            : isCurrent
                            ? 'text-cyan-300 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        {idx === 0
                          ? 'Upload'
                          : idx === 1
                          ? 'Audio'
                          : idx === 2
                          ? 'Gemini'
                          : idx === 3
                          ? 'Align'
                          : 'Ready'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Gemini Flash Turbo Model</span>
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Private &amp; Secure</span>
                </span>
              </div>
            </div>
          )}

          {/* Error Actions */}
          {stage === 'error' && (
            <div className="pt-2 border-t border-red-900/40 flex items-center justify-between gap-2">
              <span className="text-[11px] text-red-300">
                Media preserved. You can retry immediately.
              </span>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
