import React, { useState, useMemo } from 'react';
import {
  FileText,
  BookOpen,
  MessageSquare,
  Copy,
  Check,
  Download,
  Languages,
  Search,
  ArrowLeft,
  Edit2,
  Clock,
  User,
  Sparkles,
  Send,
  Loader2,
  ListOrdered,
  FileCheck,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { ChatMessage, NoteMode, SUPPORTED_LANGUAGES, TranscriptRecord, TranscriptSegment } from '../types';
import { exportToDocx, exportToPdf, exportToSrt, exportToTxt, exportToVtt } from '../utils/exporters';
import { renderMarkdown } from '../utils/markdown';

interface ResultsViewProps {
  record: TranscriptRecord;
  onUpdateRecord: (updated: TranscriptRecord) => void;
  onBack: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  record,
  onUpdateRecord,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'transcript' | 'notes' | 'chat'>('transcript');

  // Title edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(record.title);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Copy feedback
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedNotes, setCopiedNotes] = useState(false);
  const [copiedSegmentId, setCopiedSegmentId] = useState<string | null>(null);

  // Download menu
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Translate modal / state
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [targetTranslateLang, setTargetTranslateLang] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  // Note generation state
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [currentNoteMode, setCurrentNoteMode] = useState<NoteMode>(record.noteMode || 'smart_summary');

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Editing a segment inline
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingSpeaker, setEditingSpeaker] = useState('');

  // Save title edit
  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && titleInput !== record.title) {
      onUpdateRecord({ ...record, title: titleInput.trim() });
    }
  };

  // Copy full transcript
  const handleCopyTranscript = () => {
    const textToCopy = record.segments
      .map((s) => `[${s.start}] ${s.speaker ? s.speaker + ': ' : ''}${s.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  // Copy single segment
  const handleCopySegment = (seg: TranscriptSegment) => {
    const text = `[${seg.start}] ${seg.speaker ? seg.speaker + ': ' : ''}${seg.text}`;
    navigator.clipboard.writeText(text);
    setCopiedSegmentId(seg.id);
    setTimeout(() => setCopiedSegmentId(null), 1500);
  };

  // Copy notes
  const handleCopyNotes = () => {
    if (!record.notes) return;
    navigator.clipboard.writeText(record.notes);
    setCopiedNotes(true);
    setTimeout(() => setCopiedNotes(false), 2000);
  };

  // Inline segment edit handlers
  const startEditingSegment = (seg: TranscriptSegment) => {
    setEditingSegmentId(seg.id);
    setEditingText(seg.text);
    setEditingSpeaker(seg.speaker);
  };

  const saveEditingSegment = (id: string) => {
    const updatedSegments = record.segments.map((seg) => {
      if (seg.id === id) {
        return {
          ...seg,
          text: editingText.trim(),
          speaker: editingSpeaker.trim() || seg.speaker,
        };
      }
      return seg;
    });

    const updatedFullText = updatedSegments
      .map((s) => `${s.speaker ? s.speaker + ': ' : ''}${s.text}`)
      .join('\n\n');

    onUpdateRecord({
      ...record,
      segments: updatedSegments,
      fullText: updatedFullText,
    });
    setEditingSegmentId(null);
  };

  // Filtered segments with search
  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return record.segments;
    const q = searchQuery.toLowerCase();
    return record.segments.filter(
      (s) => s.text.toLowerCase().includes(q) || s.speaker.toLowerCase().includes(q) || s.start.includes(q)
    );
  }, [record.segments, searchQuery]);

  // Match count calculation
  const totalMatches = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const q = searchQuery.toLowerCase();
    let count = 0;
    record.segments.forEach((s) => {
      const occurrences = (s.text.toLowerCase().match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      count += occurrences;
    });
    return count;
  }, [record.segments, searchQuery]);

  // Calculate unique speakers & word count
  const stats = useMemo(() => {
    const speakers = new Set(record.segments.map((s) => s.speaker).filter(Boolean));
    const words = record.fullText
      ? record.fullText.trim().split(/\s+/).filter(Boolean).length
      : record.segments.reduce((acc, s) => acc + s.text.split(/\s+/).filter(Boolean).length, 0);
    return {
      wordCount: words,
      segmentCount: record.segments.length,
      speakerCount: speakers.size || 1,
    };
  }, [record]);

  // Translate handler
  const handleTranslate = async () => {
    setIsTranslating(true);
    setTranslateError(null);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: record.segments,
          targetLanguage: targetTranslateLang,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Translation failed');

      onUpdateRecord({
        ...record,
        segments: data.segments,
        fullText: data.fullText,
        language: `${targetTranslateLang.toUpperCase()} (Translated)`,
      });

      setShowTranslateModal(false);
    } catch (err: any) {
      console.error('Translation error:', err);
      setTranslateError(err.message || 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  // Note generation handler
  const handleGenerateNotes = async (mode: NoteMode) => {
    setIsGeneratingNotes(true);
    setNotesError(null);
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

      setCurrentNoteMode(mode);
      onUpdateRecord({
        ...record,
        notes: data.notes,
        noteMode: mode,
      });
      setActiveTab('notes');
    } catch (err: any) {
      console.error('Note generation error:', err);
      setNotesError(err.message || 'The AI model is experiencing temporary demand. Please try again.');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Chat message submit handler
  const handleSendChat = async (e?: React.FormEvent, presetText?: string) => {
    if (e) e.preventDefault();
    const query = presetText || chatInput.trim();
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
        text: data.reply || 'No answer could be found in the transcript.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'model',
        text: 'Sorry, I encountered an issue retrieving the answer from the transcript.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Helper to highlight matching text in segments
  const highlightMatches = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/70 text-slate-900 dark:text-white px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          {/* Back button + Editable Title */}
          <div className="flex items-start sm:items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 mt-0.5 sm:mt-0"
              title="Back to Transcriber"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    autoFocus
                    className="text-lg font-bold px-2 py-1 rounded-lg border border-cyan-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="px-2.5 py-1 text-xs font-semibold bg-cyan-600 text-white rounded-md"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {record.title}
                  </h1>
                  <Edit2 className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 transition-colors shrink-0" />
                </div>
              )}

              {/* Metadata row with anti-slop clean typography */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{record.duration}</span>
                <span aria-hidden="true">·</span>
                <span>Language: {record.language}</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{record.sourceType}</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {/* Copy Button */}
            <button
              onClick={handleCopyTranscript}
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
              title="Copy entire transcript"
            >
              {copiedTranscript ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copiedTranscript ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Translate Button */}
            <button
              onClick={() => setShowTranslateModal(true)}
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
              title="Translate transcript"
            >
              <Languages className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden sm:inline">Translate</span>
            </button>

            {/* Download Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm shadow-cyan-600/20 transition-all flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>

              {showDownloadMenu && (
                <div
                  onMouseLeave={() => setShowDownloadMenu(false)}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-30 text-xs"
                >
                  <button
                    onClick={() => {
                      exportToTxt(record);
                      setShowDownloadMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-between"
                  >
                    <span>Plain Text (.txt)</span>
                    <span className="text-[10px] text-slate-400">TXT</span>
                  </button>
                  <button
                    onClick={() => {
                      exportToDocx(record);
                      setShowDownloadMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-between"
                  >
                    <span>Microsoft Word (.docx)</span>
                    <span className="text-[10px] text-slate-400">DOCX</span>
                  </button>
                  <button
                    onClick={() => {
                      exportToPdf(record);
                      setShowDownloadMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-between"
                  >
                    <span>PDF Document (.pdf)</span>
                    <span className="text-[10px] text-slate-400">PDF</span>
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                  <button
                    onClick={() => {
                      exportToSrt(record);
                      setShowDownloadMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-between"
                  >
                    <span>Subtitles (.srt)</span>
                    <span className="text-[10px] text-slate-400">SRT</span>
                  </button>
                  <button
                    onClick={() => {
                      exportToVtt(record);
                      setShowDownloadMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-between"
                  >
                    <span>Web Video Text (.vtt)</span>
                    <span className="text-[10px] text-slate-400">VTT</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="pt-4 flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <div>
            Words: <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold tabular-nums">{stats.wordCount.toLocaleString()}</span>
          </div>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>
          <div>
            Segments: <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold tabular-nums">{stats.segmentCount}</span>
          </div>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>
          <div>
            Speakers: <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold tabular-nums">{stats.speakerCount}</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('transcript')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'transcript'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Transcript</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'notes'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Summary & Notes</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'chat'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat with Media</span>
        </button>
      </div>

      {/* TAB 1: TRANSCRIPT */}
      {activeTab === 'transcript' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-5">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search transcript, speakers, or timestamps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>

            {searchQuery && (
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {totalMatches === 0 ? 'No matches' : `${totalMatches} match${totalMatches > 1 ? 'es' : ''} found`}
              </div>
            )}
          </div>

          {/* Transcript Segments List */}
          <div className="space-y-3.5 pt-2">
            {filteredSegments.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">
                No segments matched your search query &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              filteredSegments.map((seg) => {
                const isEditing = editingSegmentId === seg.id;

                return (
                  <div
                    key={seg.id}
                    className="group relative p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/70 hover:border-cyan-300 dark:hover:border-cyan-800/60 bg-slate-50/40 dark:bg-slate-800/30 transition-all"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-cyan-600 font-semibold tabular-nums">
                            [{seg.start} - {seg.end}]
                          </span>
                          <input
                            type="text"
                            value={editingSpeaker}
                            onChange={(e) => setEditingSpeaker(e.target.value)}
                            placeholder="Speaker Name"
                            className="text-xs font-semibold px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                          />
                        </div>
                        <textarea
                          rows={3}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full text-sm p-2 rounded-lg bg-white dark:bg-slate-900 border border-cyan-500 text-slate-900 dark:text-white focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingSegmentId(null)}
                            className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEditingSegment(seg.id)}
                            className="px-3 py-1 text-xs font-semibold bg-cyan-600 text-white rounded-md"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {/* Segment Header */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums">
                              [{seg.start}]
                            </span>
                            {seg.speaker && (
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {highlightMatches(seg.speaker, searchQuery)}
                              </span>
                            )}
                          </div>

                          {/* Quick Segment Actions */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                              onClick={() => handleCopySegment(seg)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              title="Copy this segment"
                            >
                              {copiedSegmentId === seg.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => startEditingSegment(seg)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              title="Edit segment inline"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Segment Text */}
                        <p
                          onClick={() => startEditingSegment(seg)}
                          className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                          title="Click to edit inline"
                        >
                          {highlightMatches(seg.text, searchQuery)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: NOTES & SUMMARY */}
      {activeTab === 'notes' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-6">
          {/* Note Mode Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Note Mode
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleGenerateNotes('smart_summary')}
                disabled={isGeneratingNotes}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentNoteMode === 'smart_summary'
                    ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Smart Summary
              </button>
              <button
                onClick={() => handleGenerateNotes('key_points')}
                disabled={isGeneratingNotes}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentNoteMode === 'key_points'
                    ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Key Points
              </button>
              <button
                onClick={() => handleGenerateNotes('action_items')}
                disabled={isGeneratingNotes}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentNoteMode === 'action_items'
                    ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Action Items
              </button>
              <button
                onClick={() => handleGenerateNotes('study_notes')}
                disabled={isGeneratingNotes}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentNoteMode === 'study_notes'
                    ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Study Notes
              </button>
            </div>

            {record.notes && (
              <button
                onClick={handleCopyNotes}
                className="self-end sm:self-auto p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                {copiedNotes ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedNotes ? 'Copied' : 'Copy Notes'}</span>
              </button>
            )}
          </div>

          {/* Notes Error Banner */}
          {notesError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center justify-between gap-3 text-xs text-red-700 dark:text-red-300">
              <span>{notesError}</span>
              <button
                onClick={() => handleGenerateNotes(currentNoteMode)}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Note Content */}
          {isGeneratingNotes ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-cyan-500" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Generating {currentNoteMode.replace('_', ' ')} with Gemini Flash...
              </p>
            </div>
          ) : record.notes ? (
            <div
              className="markdown-body text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(record.notes) }}
            />
          ) : (
            <div className="text-center py-12 space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No notes generated for this transcript yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select one of the note modes above to automatically extract an executive summary, key bullet points, or action items.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => handleGenerateNotes('smart_summary')}
                  className="px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Smart Summary</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CHAT WITH MEDIA */}
      {activeTab === 'chat' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span>Grounded Q&A Assistant</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ask questions about the recording. Answers are strictly based on the transcribed audio.
            </p>
          </div>

          {/* Quick Prompt Suggestions */}
          {chatMessages.length === 0 && (
            <div className="py-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Suggested Questions:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'What were the main topics discussed?',
                  'Who spoke the most and what did they say?',
                  'List all decisions and next steps mentioned.',
                  'Summarize the conclusion in 2 sentences.',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendChat(undefined, prompt)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:border-cyan-400 text-slate-700 dark:text-slate-300 transition-colors text-left"
                  >
                    &ldquo;{prompt}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages Stream */}
          <div className="min-h-[240px] max-h-[460px] overflow-y-auto space-y-3.5 p-2">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-cyan-600 text-white rounded-br-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                  }`}
                >
                  <div
                    className={msg.role === 'model' ? 'markdown-body' : ''}
                    dangerouslySetInnerHTML={
                      msg.role === 'model' ? { __html: renderMarkdown(msg.text) } : undefined
                    }
                  >
                    {msg.role === 'user' ? msg.text : undefined}
                  </div>
                  <div
                    className={`text-[10px] mt-1 text-right tabular-nums ${
                      msg.role === 'user' ? 'text-cyan-100' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isChatLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 flex items-center justify-center shrink-0">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 text-xs text-slate-500 flex items-center gap-2">
                  <span>Reading transcript to find answers...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <input
              type="text"
              placeholder="Ask anything about this recording..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isChatLoading}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isChatLoading}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
        </div>
      )}

      {/* Translate Modal */}
      {showTranslateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Languages className="w-5 h-5 text-cyan-500" />
                <span>Translate Transcript</span>
              </h3>
              <button
                onClick={() => setShowTranslateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Translate all spoken text while preserving every timestamp and speaker assignment.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Language
              </label>
              <select
                value={targetTranslateLang}
                onChange={(e) => setTargetTranslateLang(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
                  <option key={l.code} value={l.name}>
                    {l.name} {l.nativeName ? `(${l.nativeName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {translateError && (
              <p className="text-xs text-red-600 dark:text-red-400">{translateError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTranslateModal(false)}
                disabled={isTranslating}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-2"
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Translating...</span>
                  </>
                ) : (
                  <span>Translate Now</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
