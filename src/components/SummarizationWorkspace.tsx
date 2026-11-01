import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Languages,
  Check,
  Copy,
  Download,
  Loader2,
  ArrowLeft,
  FileCheck2,
  ListOrdered,
  Quote,
  CheckSquare,
  HelpCircle,
  FileText,
  Sliders,
  SplitSquareVertical,
} from 'lucide-react';
import { NoteMode, SummaryDetailLevel, SUPPORTED_LANGUAGES, TranscriptRecord, TranscriptSegment } from '../types';
import { renderMarkdown } from '../utils/markdown';
import { exportToSrt, exportToTxt, exportToVtt } from '../utils/exporters';

interface SummarizationWorkspaceProps {
  record: TranscriptRecord;
  onUpdateRecord: (updated: TranscriptRecord) => void;
  onBack: () => void;
}

export const SummarizationWorkspace: React.FC<SummarizationWorkspaceProps> = ({
  record,
  onUpdateRecord,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'summarize' | 'translate'>('summarize');

  // Summary State
  const [selectedMode, setSelectedMode] = useState<NoteMode>('detailed_summary');
  const [detailLevel, setDetailLevel] = useState<SummaryDetailLevel>('balanced');
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Translation State
  const [targetLang, setTargetLang] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translatedSegments, setTranslatedSegments] = useState<TranscriptSegment[]>([]);
  const [translatedFullText, setTranslatedFullText] = useState('');
  const [copiedTranslated, setCopiedTranslated] = useState(false);

  const summaryModes: { mode: NoteMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { mode: 'short_summary', label: 'Short Summary', icon: <FileText className="w-4 h-4" />, desc: 'Core narrative and conclusion in 1-2 tight paragraphs' },
    { mode: 'detailed_summary', label: 'Detailed Summary', icon: <BookOpen className="w-4 h-4" />, desc: 'In-depth breakdown of context, evidence, and outcomes' },
    { mode: 'main_ideas', label: 'Main Ideas', icon: <Sparkles className="w-4 h-4" />, desc: 'Foundational concepts and pillars' },
    { mode: 'takeaways', label: 'Key Takeaways', icon: <ListOrdered className="w-4 h-4" />, desc: 'Bullet points of crucial metrics and insights' },
    { mode: 'quotes', label: 'Important Quotes', icon: <Quote className="w-4 h-4" />, desc: 'Verbatim quotes with speaker attribution' },
    { mode: 'action_items', label: 'Action Items', icon: <CheckSquare className="w-4 h-4" />, desc: 'Decisions made and checklist with assignees' },
    { mode: 'chapters', label: 'Chapters & Timestamps', icon: <FileCheck2 className="w-4 h-4" />, desc: 'Timed chapter markers with topic outlines' },
    { mode: 'study_notes', label: 'Study Notes', icon: <BookOpen className="w-4 h-4" />, desc: 'Key terms, glossary, and self-review questions' },
    { mode: 'minutes', label: 'Meeting Minutes', icon: <FileText className="w-4 h-4" />, desc: 'Formal agenda, motions, decisions, and follow-ups' },
    { mode: 'qa', label: 'Questions & Answers', icon: <HelpCircle className="w-4 h-4" />, desc: 'Direct FAQ and answers derived from speech' },
  ];

  // Generate Summary Handler
  const handleGenerateSummary = async (modeToRun: NoteMode = selectedMode) => {
    setIsGenerating(true);
    setSummaryError(null);
    try {
      const res = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: record.fullText || record.segments.map((s) => s.text).join(' '),
          title: record.title,
          noteMode: modeToRun,
          detailLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate AI summary');

      setSelectedMode(modeToRun);
      onUpdateRecord({
        ...record,
        notes: data.notes,
        noteMode: modeToRun,
      });
    } catch (err: any) {
      console.error('Summary error:', err);
      setSummaryError(err.message || 'The AI model is experiencing temporary demand. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Translate Handler
  const handleTranslate = async () => {
    setIsTranslating(true);
    setTranslateError(null);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: record.segments,
          targetLanguage: targetLang,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Translation failed');

      setTranslatedSegments(data.segments);
      setTranslatedFullText(data.fullText);
    } catch (err: any) {
      console.error('Translation error:', err);
      setTranslateError(err.message || 'Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopySummary = () => {
    if (!record.notes) return;
    navigator.clipboard.writeText(record.notes);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleCopyTranslated = () => {
    if (!translatedFullText) return;
    navigator.clipboard.writeText(translatedFullText);
    setCopiedTranslated(true);
    setTimeout(() => setCopiedTranslated(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-500" />
              <span>AI Intelligence & Translation Studio</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Summarize long media recordings or translate subtitles into 30+ languages.
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('summarize')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'summarize'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>AI Summarization</span>
          </button>

          <button
            onClick={() => setActiveTab('translate')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'translate'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Languages className="w-4 h-4" />
            <span>Multilingual Translation</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: AI SUMMARIZATION */}
      {activeTab === 'summarize' && (
        <div className="space-y-6">
          {/* Controls: Mode Cards & Detail Level */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Select Synthesis Type</h3>
                <p className="text-xs text-slate-500">Pick from 10 distinct AI summarization algorithms</p>
              </div>

              {/* Detail Level Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                {(['concise', 'balanced', 'detailed'] as SummaryDetailLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setDetailLevel(lvl)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      detailLevel === lvl
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Selection Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {summaryModes.map((item) => (
                <button
                  key={item.mode}
                  onClick={() => {
                    setSelectedMode(item.mode);
                    handleGenerateSummary(item.mode);
                  }}
                  disabled={isGenerating}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedMode === item.mode
                      ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 font-semibold text-xs">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Generated Result View */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  {summaryModes.find((m) => m.mode === selectedMode)?.label || 'Summary'}
                </span>
                <span className="text-xs text-slate-400 font-mono">({detailLevel})</span>
              </div>

              {record.notes && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySummary}
                    className="p-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSummary ? 'Copied' : 'Copy Text'}</span>
                  </button>
                  <button
                    onClick={() => handleGenerateSummary()}
                    disabled={isGenerating}
                    className="p-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                </div>
              )}
            </div>

            {/* Error Banner */}
            {summaryError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center justify-between gap-3 text-xs text-red-700 dark:text-red-300">
                <span>{summaryError}</span>
                <button
                  onClick={() => handleGenerateSummary()}
                  className="px-2.5 py-1 bg-red-600 text-white rounded font-semibold"
                >
                  Retry
                </button>
              </div>
            )}

            {isGenerating ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-500" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Synthesizing transcript with Gemini Flash...
                </p>
                <p className="text-xs text-slate-400">Extracting facts, quotes, and structural themes</p>
              </div>
            ) : record.notes ? (
              <div
                className="markdown-body text-sm leading-relaxed text-slate-800 dark:text-slate-200"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(record.notes) }}
              />
            ) : (
              <div className="py-12 text-center space-y-3">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Ready to analyze your recording
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click any of the cards above to generate an executive summary, action checklist, study notes, or Q&A.
                </p>
                <button
                  onClick={() => handleGenerateSummary('detailed_summary')}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  Generate Detailed Summary
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: MULTILINGUAL TRANSLATION */}
      {activeTab === 'translate' && (
        <div className="space-y-6">
          {/* Target Language Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Languages className="w-5 h-5 text-cyan-500" />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Original Speech Language:
                </span>
                <span className="ml-2 font-mono text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
                  {record.language}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Translate to:</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                disabled={isTranslating}
                className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
                  <option key={l.code} value={l.name}>
                    {l.name} {l.nativeName ? `(${l.nativeName})` : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
              >
                {isTranslating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                <span>Translate</span>
              </button>
            </div>
          </div>

          {/* Translation Error */}
          {translateError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300">
              {translateError}
            </div>
          )}

          {/* Side-by-Side Comparison Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Original Column */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Original Transcript</span>
                <span className="text-xs font-mono text-slate-400">({record.language})</span>
              </div>
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {record.segments.map((seg) => (
                  <div key={seg.id} className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 text-xs space-y-1">
                    <div className="flex justify-between font-mono text-[10px] text-cyan-600 dark:text-cyan-400">
                      <span>[{seg.start}]</span>
                      <span className="font-bold">{seg.speaker}</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{seg.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Translated Column */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  Translated Transcript
                </span>
                {translatedFullText && (
                  <button
                    onClick={handleCopyTranslated}
                    className="p-1 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {copiedTranslated ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTranslated ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              {isTranslating ? (
                <div className="py-20 text-center space-y-2">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto text-cyan-500" />
                  <p className="text-xs text-slate-500">Translating segments into {targetLang}...</p>
                </div>
              ) : translatedSegments.length > 0 ? (
                <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                  {translatedSegments.map((seg) => (
                    <div key={seg.id} className="p-3 rounded-xl bg-cyan-50/40 dark:bg-cyan-950/20 text-xs space-y-1">
                      <div className="flex justify-between font-mono text-[10px] text-cyan-600 dark:text-cyan-400">
                        <span>[{seg.start}]</span>
                        <span className="font-bold">{seg.speaker}</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{seg.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center space-y-2 text-slate-400">
                  <Languages className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs">Choose a target language above and click &ldquo;Translate&rdquo;</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
