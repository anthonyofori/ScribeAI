import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Search,
  Replace,
  Copy,
  Check,
  Undo2,
  Redo2,
  Edit3,
  Clock,
  User,
  Sparkles,
  Download,
  Languages,
  Subtitles,
  ArrowLeft,
  CheckCircle2,
  Paperclip,
  Youtube,
  FileAudio,
  FileVideo,
  Volume1,
  MessageSquare,
  BookOpen,
  Send,
  Loader2,
  RefreshCw,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { ChatMessage, NoteMode, TranscriptRecord, TranscriptSegment } from '../types';
import { exportToDocx, exportToPdf, exportToSrt, exportToTxt, exportToVtt } from '../utils/exporters';
import { renderMarkdown } from '../utils/markdown';

interface TranscriptionWorkspaceProps {
  record: TranscriptRecord;
  onUpdateRecord: (updated: TranscriptRecord) => void;
  onNavigateSubtitles: () => void;
  onNavigateSummaries: () => void;
  onNavigateTranslate: () => void;
  onBack: () => void;
}

function getYouTubeId(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return v;
      if (parsed.pathname.includes('/shorts/')) return parsed.pathname.split('/shorts/')[1];
    }
  } catch {}
  return null;
}

export const TranscriptionWorkspace: React.FC<TranscriptionWorkspaceProps> = ({
  record,
  onUpdateRecord,
  onNavigateSubtitles,
  onNavigateSummaries,
  onNavigateTranslate,
  onBack,
}) => {
  // Right panel active tab
  const [activeRightTab, setActiveRightTab] = useState<'transcript' | 'summary' | 'chat'>('transcript');

  // Media Player State & Refs
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [mediaSource, setMediaSource] = useState<string | undefined>(record.mediaUrl || record.audioUrl);
  const [usingFallbackAudio, setUsingFallbackAudio] = useState(false);
  const [durationSec, setDurationSec] = useState<number>(() => {
    if (record.durationSeconds && record.durationSeconds > 0) return record.durationSeconds;
    if (record.segments && record.segments.length > 0) {
      const last = record.segments[record.segments.length - 1];
      if (last.endMs) return Math.ceil(last.endMs / 1000);
    }
    return 60;
  });
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [useSpeechSynthesis, setUseSpeechSynthesis] = useState(false);
  const [mediaLoadError, setMediaLoadError] = useState<string | null>(null);

  useEffect(() => {
    setMediaSource(record.mediaUrl || record.audioUrl);
    setUsingFallbackAudio(false);
    setMediaLoadError(null);
  }, [record.mediaUrl, record.audioUrl]);

  // Search & Find-and-Replace State
  const [searchQuery, setSearchQuery] = useState('');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [replaceQuery, setReplaceQuery] = useState('');

  // Undo / Redo History Stack
  const [historyStack, setHistoryStack] = useState<TranscriptSegment[][]>([record.segments]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Title edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(record.title);

  // Autosave status state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedNotes, setCopiedNotes] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Notes regeneration state inside workspace
  const [workspaceNoteMode, setWorkspaceNoteMode] = useState<NoteMode>(record.noteMode || 'smart_summary');
  const [isRegeneratingNotes, setIsRegeneratingNotes] = useState(false);

  // Chat with Media State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // File reattach ref
  const reattachInputRef = useRef<HTMLInputElement | null>(null);

  // Identify YouTube video
  const youtubeVideoId = useMemo(() => {
    return getYouTubeId(record.youtubeUrl || record.mediaUrl);
  }, [record.youtubeUrl, record.mediaUrl]);

  const isVideo = useMemo(() => {
    if (record.fileFormat?.startsWith('video/')) return true;
    if (record.fileName && /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(record.fileName)) return true;
    if (record.mediaUrl && /\.(mp4|mov|webm|mkv|m4v)(\?.*)?$/i.test(record.mediaUrl)) return true;
    return false;
  }, [record.fileFormat, record.fileName, record.mediaUrl]);

  // Send command to YouTube iframe via postMessage
  const sendYouTubeCommand = (func: string, args: any[] = []) => {
    try {
      if (ytIframeRef.current?.contentWindow) {
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      }
    } catch (e) {
      console.warn('YouTube postMessage error:', e);
    }
  };

  // Listen for YouTube player events
  useEffect(() => {
    if (!youtubeVideoId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data !== 'string') return;
        const data = JSON.parse(event.data);
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            setCurrentTimeMs(Math.floor(data.info.currentTime * 1000));
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDurationSec(data.info.duration);
          }
          if (data.info.playerState === 1) setIsPlaying(true);
          if (data.info.playerState === 2) setIsPlaying(false);
          if (data.info.playerState === 0) setIsPlaying(false);
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [youtubeVideoId]);

  // Update segments with undo stack tracking
  const updateSegmentsWithHistory = (newSegments: TranscriptSegment[]) => {
    const newStack = historyStack.slice(0, historyIndex + 1);
    newStack.push(newSegments);
    setHistoryStack(newStack);
    setHistoryIndex(newStack.length - 1);

    const fullText = newSegments
      .map((s) => `${s.speaker ? s.speaker + ': ' : ''}${s.text}`)
      .join('\n\n');

    setSaveStatus('saving');
    onUpdateRecord({
      ...record,
      segments: newSegments,
      fullText,
    });
    setTimeout(() => setSaveStatus('saved'), 600);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      const prevSegments = historyStack[newIdx];
      setHistoryIndex(newIdx);
      const fullText = prevSegments
        .map((s) => `${s.speaker ? s.speaker + ': ' : ''}${s.text}`)
        .join('\n\n');
      onUpdateRecord({ ...record, segments: prevSegments, fullText });
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const newIdx = historyIndex + 1;
      const nextSegments = historyStack[newIdx];
      setHistoryIndex(newIdx);
      const fullText = nextSegments
        .map((s) => `${s.speaker ? s.speaker + ': ' : ''}${s.text}`)
        .join('\n\n');
      onUpdateRecord({ ...record, segments: nextSegments, fullText });
    }
  };

  // Find & Replace Handler
  const handleFindAndReplace = (replaceAll: boolean = false) => {
    if (!searchQuery.trim()) return;

    let replaced = false;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), replaceAll ? 'gi' : 'i');

    const updated = record.segments.map((seg) => {
      if (!replaceAll && replaced) return seg;
      if (regex.test(seg.text)) {
        replaced = true;
        return {
          ...seg,
          text: seg.text.replace(regex, replaceQuery),
        };
      }
      return seg;
    });

    updateSegmentsWithHistory(updated);
  };

  // Media Time Update listener for HTML5 video/audio
  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      const ms = Math.floor(mediaRef.current.currentTime * 1000);
      setCurrentTimeMs(ms);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current && mediaRef.current.duration && !isNaN(mediaRef.current.duration)) {
      setDurationSec(mediaRef.current.duration);
    }
  };

  // Fallback timer when media element is not present, YouTube is playing, or format needs synthetic clock
  useEffect(() => {
    if (!isPlaying) return;
    // If HTML5 media element is playing and healthy, its own onTimeUpdate handles time
    if (mediaRef.current && !mediaLoadError && !youtubeVideoId && !mediaRef.current.paused) return;

    const interval = setInterval(() => {
      setCurrentTimeMs((prev) => {
        const next = prev + 100 * playbackRate;
        if (next >= durationSec * 1000) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackRate, durationSec, mediaLoadError, youtubeVideoId]);

  // Identify currently active segment based on currentTimeMs
  const activeSegmentIndex = useMemo(() => {
    return record.segments.findIndex((seg) => {
      const s = seg.startMs || 0;
      const e = seg.endMs || s + 4000;
      return currentTimeMs >= s && currentTimeMs <= e;
    });
  }, [record.segments, currentTimeMs]);

  const activeSegment = record.segments[activeSegmentIndex] || null;

  // Click timestamp to seek media
  const handleSeekToSegment = (seg: TranscriptSegment) => {
    const targetMs = seg.startMs || 0;
    const targetSec = targetMs / 1000;
    setCurrentTimeMs(targetMs);

    if (youtubeVideoId) {
      sendYouTubeCommand('seekTo', [targetSec, true]);
      sendYouTubeCommand('playVideo');
      setIsPlaying(true);
    } else if (mediaRef.current) {
      try {
        mediaRef.current.currentTime = targetSec;
        const playPromise = mediaRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(true));
        } else {
          setIsPlaying(true);
        }
      } catch {
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(true);
    }

    if (useSpeechSynthesis && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(seg.text);
      utterance.rate = playbackRate;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggle playback
  const togglePlay = () => {
    if (youtubeVideoId) {
      if (isPlaying) {
        sendYouTubeCommand('pauseVideo');
        setIsPlaying(false);
      } else {
        sendYouTubeCommand('playVideo');
        setIsPlaying(true);
      }
      return;
    }

    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = mediaRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setMediaLoadError(null);
            })
            .catch((err) => {
              console.warn('Playback error. Attempting universal audio track fallback:', err);
              if (record.audioUrl && mediaSource !== record.audioUrl) {
                setMediaSource(record.audioUrl);
                setUsingFallbackAudio(true);
                setMediaLoadError(null);
              }
              setIsPlaying(true);
            });
        } else {
          setIsPlaying(true);
        }
      }
      return;
    }

    // Toggle simulated/speech playback
    setIsPlaying((prev) => !prev);
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (youtubeVideoId) {
      sendYouTubeCommand('setPlaybackRate', [rate]);
    } else if (mediaRef.current) {
      mediaRef.current.playbackRate = rate;
    }
  };

  // Format MM:SS
  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // Copy full transcript
  const handleCopy = () => {
    navigator.clipboard.writeText(record.fullText || record.segments.map((s) => s.text).join('\n'));
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  // Copy notes
  const handleCopyNotes = () => {
    if (!record.notes) return;
    navigator.clipboard.writeText(record.notes);
    setCopiedNotes(true);
    setTimeout(() => setCopiedNotes(false), 2000);
  };

  // Regenerate notes inside workspace
  const handleRegenerateNotes = async (mode: NoteMode) => {
    setIsRegeneratingNotes(true);
    setWorkspaceNoteMode(mode);
    try {
      const res = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: record.fullText || record.segments.map((s) => s.text).join(' '),
          title: record.title,
          noteMode: mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate notes');
      onUpdateRecord({
        ...record,
        notes: data.notes,
        noteMode: mode,
      });
    } catch (err: any) {
      console.error('Note generation error:', err);
    } finally {
      setIsRegeneratingNotes(false);
    }
  };

  // Send Chat message
  const handleSendChat = async (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const query = presetQuery || chatInput.trim();
    if (!query || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: record.fullText || record.segments.map((s) => `${s.speaker}: ${s.text}`).join('\n'),
          title: record.title,
          messages: [...chatMessages, userMsg].map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to answer question');

      const modelMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'model',
        text: data.reply || 'No information could be located in the transcript.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'model',
        text: 'Sorry, I could not query the transcript right now. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Reattach local media file (for restored sessions)
  const handleReattachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newUrl = URL.createObjectURL(file);
      setMediaLoadError(null);
      onUpdateRecord({
        ...record,
        mediaUrl: newUrl,
        fileName: file.name,
        fileFormat: file.type,
      });
    }
  };

  // Auto-scroll active segment into view when playing
  useEffect(() => {
    if (!isPlaying || activeSegmentIndex < 0 || activeRightTab !== 'transcript') return;
    const el = document.getElementById(`seg_row_${activeSegmentIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeSegmentIndex, isPlaying, activeRightTab]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingTitle(false);
                      if (titleInput.trim()) onUpdateRecord({ ...record, title: titleInput.trim() });
                    }
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  autoFocus
                  className="text-base sm:text-lg font-bold px-2 py-0.5 rounded-lg border border-cyan-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  onClick={() => {
                    setIsEditingTitle(false);
                    if (titleInput.trim()) onUpdateRecord({ ...record, title: titleInput.trim() });
                  }}
                  className="px-2 py-0.5 text-xs font-semibold bg-cyan-600 text-white rounded-md"
                >
                  Save
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setIsEditingTitle(true)}
              >
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate max-w-md sm:max-w-xl">
                  {record.title}
                </h1>
                <Edit3 className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 transition-colors" />
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{record.language}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{record.duration}</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{saveStatus === 'saved' ? 'Auto-Saved' : 'Saving...'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Workspace Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onNavigateSubtitles}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 hover:border-cyan-400 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Subtitles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Subtitle Studio</span>
          </button>

          <button
            onClick={onNavigateSummaries}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 hover:border-cyan-400 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>AI Summaries</span>
          </button>

          <button
            onClick={onNavigateTranslate}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 hover:border-cyan-400 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Languages className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Translate</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div
                onMouseLeave={() => setShowExportMenu(false)}
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-30 text-xs"
              >
                <button
                  onClick={() => {
                    exportToTxt(record);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between text-slate-700 dark:text-slate-200"
                >
                  <span>Plain Text</span>
                  <span className="text-[10px] text-slate-400 font-mono">TXT</span>
                </button>
                <button
                  onClick={() => {
                    exportToSrt(record);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between text-slate-700 dark:text-slate-200"
                >
                  <span>Subtitles</span>
                  <span className="text-[10px] text-slate-400 font-mono">SRT</span>
                </button>
                <button
                  onClick={() => {
                    exportToVtt(record);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between text-slate-700 dark:text-slate-200"
                >
                  <span>WebVTT</span>
                  <span className="text-[10px] text-slate-400 font-mono">VTT</span>
                </button>
                <button
                  onClick={() => {
                    exportToDocx(record);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between text-slate-700 dark:text-slate-200"
                >
                  <span>Word Document</span>
                  <span className="text-[10px] text-slate-400 font-mono">DOCX</span>
                </button>
                <button
                  onClick={() => {
                    exportToPdf(record);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between text-slate-700 dark:text-slate-200"
                >
                  <span>PDF Document</span>
                  <span className="text-[10px] text-slate-400 font-mono">PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Media Player & Synchronizer (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm sticky top-20">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Media Player & Synchronizer
            </h2>
            <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-semibold tabular-nums">
              {formatTime(currentTimeMs / 1000)} / {formatTime(durationSec)}
            </div>
          </div>

          {/* Media Player Canvas (Video, YouTube, or Audio Waveform) */}
          <div className="relative rounded-xl bg-slate-950 overflow-hidden aspect-video flex items-center justify-center border border-slate-800 shadow-inner">
            {youtubeVideoId ? (
              <iframe
                ref={ytIframeRef}
                src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                title="YouTube Video Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full object-cover"
              />
            ) : record.mediaUrl && !mediaLoadError ? (
              isVideo ? (
                <video
                  ref={mediaRef as any}
                  src={record.mediaUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onError={() => setMediaLoadError('Direct video playback error')}
                  className="w-full h-full object-contain"
                  playsInline
                />
              ) : (
                <div className="w-full h-full flex flex-col justify-between p-4">
                  <audio
                    ref={mediaRef as any}
                    src={record.mediaUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onError={() => setMediaLoadError('Direct audio playback error')}
                    className="hidden"
                  />
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/80 font-mono">
                      <FileAudio className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{record.fileName || 'Audio Stream'}</span>
                    </span>
                    <span className="font-mono text-cyan-400">{formatTime(currentTimeMs / 1000)}</span>
                  </div>

                  {/* Animated Waveform Visualizer */}
                  <div className="flex items-center justify-center gap-1 h-16 px-4">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          height: `${
                            isPlaying
                              ? Math.max(15, Math.sin(currentTimeMs / 150 + i * 0.4) * 45 + 50)
                              : Math.sin(i * 0.5) * 20 + 25
                          }%`,
                        }}
                        className={`flex-1 rounded-full transition-all duration-100 ${
                          isPlaying ? 'bg-gradient-to-t from-cyan-600 to-teal-400' : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="text-center text-[11px] text-slate-400">
                    Synchronized Voice Waveform
                  </div>
                </div>
              )
            ) : (
              /* Synchronized Timeline & Waveform visualizer fallback */
              <div className="w-full h-full flex flex-col justify-between p-4 text-center">
                <div className="flex items-center justify-between text-xs text-white/70">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                    <Volume1 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Synchronized Speech Tracker</span>
                  </span>
                  <span className="font-mono text-cyan-400 text-xs">{formatTime(currentTimeMs / 1000)}</span>
                </div>

                <div className="flex items-center justify-center gap-1 h-16">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        height: `${
                          isPlaying
                            ? Math.max(15, Math.sin(currentTimeMs / 150 + i * 0.4) * 40 + 45)
                            : Math.sin(i * 0.5) * 15 + 20
                        }%`,
                      }}
                      className={`w-1.5 rounded-full transition-all duration-100 ${
                        isPlaying ? 'bg-gradient-to-t from-cyan-600 to-teal-400' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2">
                  <input
                    type="file"
                    ref={reattachInputRef}
                    onChange={handleReattachFile}
                    accept="audio/*,video/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => reattachInputRef.current?.click()}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Paperclip className="w-3 h-3" />
                    <span>Attach local media file</span>
                  </button>
                </div>
              </div>
            )}

            {/* Live Subtitle Overlay */}
            {activeSegment && (
              <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-lg bg-black/85 backdrop-blur-xs text-center pointer-events-none transition-all">
                <p className="text-xs font-semibold text-yellow-300 drop-shadow-sm leading-tight">
                  {activeSegment.speaker ? `${activeSegment.speaker}: ` : ''}
                  {activeSegment.text}
                </p>
              </div>
            )}
          </div>

          {/* Progress Seek Bar */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={Math.max(1, durationSec)}
              step={0.1}
              value={currentTimeMs / 1000}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCurrentTimeMs(val * 1000);
                if (youtubeVideoId) {
                  sendYouTubeCommand('seekTo', [val, true]);
                } else if (mediaRef.current) {
                  mediaRef.current.currentTime = val;
                }
              }}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Player Transport Controls */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow-sm transition-transform active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => {
                  const target = Math.max(0, currentTimeMs - 5000);
                  const targetSec = target / 1000;
                  if (youtubeVideoId) {
                    sendYouTubeCommand('seekTo', [targetSec, true]);
                  } else if (mediaRef.current) {
                    mediaRef.current.currentTime = targetSec;
                  }
                  setCurrentTimeMs(target);
                }}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Rewind 5 seconds"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  if (youtubeVideoId) {
                    sendYouTubeCommand(nextMuted ? 'mute' : 'unMute');
                  } else if (mediaRef.current) {
                    mediaRef.current.muted = nextMuted;
                  }
                }}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Web Speech API synthetic voice toggle */}
              <button
                onClick={() => setUseSpeechSynthesis(!useSpeechSynthesis)}
                className={`p-2 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  useSpeechSynthesis
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Read dialogue segments aloud using browser speech"
              >
                <Volume1 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Voice TTS</span>
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => changeSpeed(rate)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                    playbackRate === rate
                      ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: 3 Tabs (Transcript Dialogue, Executive Notes, Chat with Media) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-sm">
          {/* Tab Selector Header */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto scrollbar-none pb-0.5">
            <button
              onClick={() => setActiveRightTab('transcript')}
              className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeRightTab === 'transcript'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Transcript</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                {record.segments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveRightTab('summary')}
              className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeRightTab === 'summary'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Summary & Notes</span>
            </button>

            <button
              onClick={() => setActiveRightTab('chat')}
              className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeRightTab === 'chat'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat with Media</span>
            </button>
          </div>

          {/* TAB 1: TRANSCRIPT DIALOGUE */}
          {activeRightTab === 'transcript' && (
            <div className="space-y-4">
              {/* Transcript Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Click any timestamp to jump to that moment in audio/video.
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowFindReplace(!showFindReplace)}
                    className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                      showFindReplace
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Find & Replace</span>
                  </button>

                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 disabled:opacity-40"
                    title="Undo"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= historyStack.length - 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 disabled:opacity-40"
                    title="Redo"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleCopy}
                    className="p-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                    title="Copy full transcript"
                  >
                    {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTranscript ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Find and Replace Bar */}
              {showFindReplace && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Find text..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg flex-1 min-w-[120px]"
                  />
                  <input
                    type="text"
                    placeholder="Replace with..."
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg flex-1 min-w-[120px]"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleFindAndReplace(false)}
                      className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium hover:bg-slate-300"
                    >
                      Replace Next
                    </button>
                    <button
                      onClick={() => handleFindAndReplace(true)}
                      className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Replace All
                    </button>
                  </div>
                </div>
              )}

              {/* Segments Stream */}
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {record.segments.map((seg, idx) => {
                  const isActive = activeSegmentIndex === idx;

                  return (
                    <div
                      key={seg.id}
                      id={`seg_row_${idx}`}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isActive
                          ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/40 shadow-xs ring-1 ring-cyan-500/30'
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        {/* Timestamp Button (Seeks Media) */}
                        <button
                          onClick={() => handleSeekToSegment(seg)}
                          className={`font-mono text-xs font-semibold flex items-center gap-1.5 tabular-nums transition-colors ${
                            isActive
                              ? 'text-cyan-700 dark:text-cyan-300 font-bold'
                              : 'text-cyan-600 dark:text-cyan-400 hover:underline'
                          }`}
                          title="Click to seek media player to this timestamp"
                        >
                          {isActive && isPlaying ? (
                            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span>[{seg.start}]</span>
                        </button>

                        {/* Speaker Label Edit */}
                        <input
                          type="text"
                          value={seg.speaker}
                          onChange={(e) => {
                            const newSpeaker = e.target.value;
                            const updated = record.segments.map((s) =>
                              s.id === seg.id ? { ...s, speaker: newSpeaker } : s
                            );
                            updateSegmentsWithHistory(updated);
                          }}
                          className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-cyan-500 focus:outline-none text-right px-1"
                          title="Click to rename speaker"
                        />
                      </div>

                      {/* Editable Segment Text */}
                      <textarea
                        rows={Math.max(2, Math.ceil(seg.text.length / 75))}
                        value={seg.text}
                        onChange={(e) => {
                          const newText = e.target.value;
                          const updated = record.segments.map((s) =>
                            s.id === seg.id ? { ...s, text: newText } : s
                          );
                          updateSegmentsWithHistory(updated);
                        }}
                        className="w-full text-sm text-slate-800 dark:text-slate-100 bg-transparent border-0 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50 rounded-lg p-1 leading-relaxed"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SUMMARY & EXECUTIVE NOTES */}
          {activeRightTab === 'summary' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <select
                    value={workspaceNoteMode}
                    onChange={(e) => setWorkspaceNoteMode(e.target.value as NoteMode)}
                    className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
                  >
                    <option value="smart_summary">Smart Summary</option>
                    <option value="short_summary">Executive Short Summary</option>
                    <option value="detailed_summary">Detailed Breakdown</option>
                    <option value="main_ideas">Main Ideas</option>
                    <option value="key_points">Key Points</option>
                    <option value="action_items">Action Items & Decisions</option>
                    <option value="chapters">Chapters & Timestamps</option>
                    <option value="study_notes">Study Notes</option>
                    <option value="minutes">Meeting Minutes</option>
                  </select>

                  <button
                    onClick={() => handleRegenerateNotes(workspaceNoteMode)}
                    disabled={isRegeneratingNotes}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    {isRegeneratingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>{isRegeneratingNotes ? 'Generating...' : 'Generate'}</span>
                  </button>
                </div>

                {record.notes && (
                  <button
                    onClick={handleCopyNotes}
                    className="p-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                  >
                    {copiedNotes ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedNotes ? 'Copied' : 'Copy Notes'}</span>
                  </button>
                )}
              </div>

              {/* Markdown Render Area */}
              <div className="max-h-[620px] overflow-y-auto pr-2">
                {record.notes ? (
                  <div
                    className="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(record.notes) }}
                  />
                ) : (
                  <div className="text-center py-16 space-y-3">
                    <Sparkles className="w-8 h-8 text-cyan-500 mx-auto opacity-70" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No summary generated yet for this recording.
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Select a note format above and click "Generate" to extract executive takeaways, action items, or study notes.
                    </p>
                    <button
                      onClick={() => handleRegenerateNotes('smart_summary')}
                      disabled={isRegeneratingNotes}
                      className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Smart Summary</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CHAT WITH MEDIA */}
          {activeRightTab === 'chat' && (
            <div className="flex flex-col h-[620px] justify-between">
              {/* Messages list */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center mx-auto text-cyan-600">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Ask Questions About This Recording
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                        Answers are grounded strictly in the speech transcript. Inaudible sections are never invented.
                      </p>
                    </div>

                    {/* Preset Question Chips */}
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {[
                        'What were the main points discussed?',
                        'What decisions or action items were agreed upon?',
                        'Summarize who said what in this conversation',
                      ].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => handleSendChat(undefined, preset)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:border-cyan-400 hover:text-cyan-600 text-left transition-colors"
                        >
                          &ldquo;{preset}&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-cyan-600 text-white rounded-br-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-bl-xs'
                        }`}
                      >
                        {msg.role === 'model' ? (
                          <div
                            className="prose dark:prose-invert prose-xs max-w-none"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                          />
                        ) : (
                          msg.text
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 px-1 mt-0.5">{msg.timestamp}</span>
                    </div>
                  ))
                )}

                {isChatLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                    <span>Searching transcript for answer...</span>
                  </div>
                )}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendChat} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question about the video or transcript..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Floating Sticky Transport Bar for Mobile Screens */}
      <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30 bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-2 px-3.5 shadow-2xl flex items-center justify-between gap-2.5 text-white">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-transform"
            aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => {
              const target = Math.max(0, currentTimeMs - 5000);
              const targetSec = target / 1000;
              if (youtubeVideoId) {
                sendYouTubeCommand('seekTo', [targetSec, true]);
              } else if (mediaRef.current) {
                mediaRef.current.currentTime = targetSec;
              }
              setCurrentTimeMs(target);
            }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Rewind 5s"
            aria-label="Rewind 5 seconds"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="font-mono text-[11px] text-cyan-300 font-bold tabular-nums">
              {formatTime(currentTimeMs / 1000)} / {formatTime(durationSec)}
            </div>
            {activeSegment && (
              <p className="text-[10px] text-slate-300 truncate">
                {activeSegment.speaker ? `${activeSegment.speaker}: ` : ''}{activeSegment.text}
              </p>
            )}
          </div>
        </div>

        {/* Speed cycle toggle */}
        <button
          onClick={() => {
            const rates = [1, 1.25, 1.5, 2];
            const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
            changeSpeed(rates[nextIdx]);
          }}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-[10px] font-mono font-bold shrink-0 border border-slate-700"
          title="Cycle playback speed"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
};
