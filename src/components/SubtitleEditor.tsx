import React, { useState, useMemo } from 'react';
import {
  Subtitles,
  Download,
  Scissors,
  Merge,
  Clock,
  ArrowLeft,
  Sliders,
  AlertTriangle,
  Check,
  FileCode,
  FileText,
} from 'lucide-react';
import { TranscriptRecord, TranscriptSegment } from '../types';
import { exportToSrt, exportToTxt, exportToVtt } from '../utils/exporters';

interface SubtitleEditorProps {
  record: TranscriptRecord;
  onUpdateRecord: (updated: TranscriptRecord) => void;
  onBack: () => void;
}

export const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  record,
  onUpdateRecord,
  onBack,
}) => {
  const [maxCharsPerLine, setMaxCharsPerLine] = useState(37);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Time format helper
  const formatSrtTimecode = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  };

  // Split Segment in two
  const handleSplitSegment = (index: number) => {
    const target = record.segments[index];
    const words = target.text.split(' ');
    if (words.length <= 1) return;

    const mid = Math.ceil(words.length / 2);
    const text1 = words.slice(0, mid).join(' ');
    const text2 = words.slice(mid).join(' ');

    const sMs = target.startMs || 0;
    const eMs = target.endMs || sMs + 4000;
    const midMs = Math.round((sMs + eMs) / 2);

    const m1 = Math.floor(midMs / 60000);
    const s1 = Math.floor((midMs % 60000) / 1000);
    const midTimeStr = `${String(m1).padStart(2, '0')}:${String(s1).padStart(2, '0')}`;

    const seg1: TranscriptSegment = {
      ...target,
      text: text1,
      end: midTimeStr,
      endMs: midMs,
    };

    const seg2: TranscriptSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      start: midTimeStr,
      end: target.end,
      startMs: midMs,
      endMs: eMs,
      speaker: target.speaker,
      text: text2,
      order: (target.order || index) + 1,
    };

    const updated = [
      ...record.segments.slice(0, index),
      seg1,
      seg2,
      ...record.segments.slice(index + 1),
    ];

    onUpdateRecord({ ...record, segments: updated });
  };

  // Merge with Next Segment
  const handleMergeNext = (index: number) => {
    if (index >= record.segments.length - 1) return;
    const current = record.segments[index];
    const next = record.segments[index + 1];

    const merged: TranscriptSegment = {
      ...current,
      end: next.end,
      endMs: next.endMs,
      text: `${current.text} ${next.text}`.trim(),
    };

    const updated = [
      ...record.segments.slice(0, index),
      merged,
      ...record.segments.slice(index + 2),
    ];

    onUpdateRecord({ ...record, segments: updated });
  };

  // Adjust timing
  const handleAdjustTime = (index: number, field: 'startMs' | 'endMs', deltaSec: number) => {
    const updated = record.segments.map((s, i) => {
      if (i !== index) return s;
      const current = s[field] || 0;
      const newMs = Math.max(0, current + deltaSec * 1000);
      const m = Math.floor(newMs / 60000);
      const sec = Math.floor((newMs % 60000) / 1000);
      const formatted = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

      return {
        ...s,
        [field]: newMs,
        [field === 'startMs' ? 'start' : 'end']: formatted,
      };
    });

    onUpdateRecord({ ...record, segments: updated });
  };

  // Export JSON
  const handleExportJson = () => {
    const payload = JSON.stringify(record.segments, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.title.replace(/[^a-z0-9_-]/gi, '_')}_subtitles.json`;
    a.click();
    URL.revokeObjectURL(url);
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
              <Subtitles className="w-5 h-5 text-cyan-500" />
              <span>Subtitle & Closed Caption Studio</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Format, time, split, merge and export broadcast-compliant SRT and WebVTT tracks.
            </p>
          </div>
        </div>

        {/* Export Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToSrt(record)}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download SRT</span>
          </button>
          <button
            onClick={() => exportToVtt(record)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
          >
            <span>Download VTT</span>
          </button>
          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Subtitle Line Configuration Strip */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Max Characters Per Line Guide:
          </span>
          <div className="flex items-center gap-1.5">
            {[32, 37, 42, 50].map((count) => (
              <button
                key={count}
                onClick={() => setMaxCharsPerLine(count)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  maxCharsPerLine === count
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {count} chars
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Total Subtitle Blocks: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{record.segments.length}</span>
        </div>
      </div>

      {/* Live Subtitle Overlay Preview Screen */}
      <div className="bg-slate-950 rounded-2xl p-6 sm:p-10 border border-slate-800 shadow-xl relative overflow-hidden text-center aspect-21/9 flex flex-col justify-end items-center">
        <div className="absolute top-4 left-4 text-xs font-mono text-cyan-400/80 uppercase tracking-widest">
          Screen Subtitle Overlay Preview (Segment {previewIndex + 1}/{record.segments.length})
        </div>

        {record.segments[previewIndex] && (
          <div className="max-w-2xl px-6 py-2 rounded-lg bg-black/80 backdrop-blur-xs text-white text-base sm:text-lg font-semibold tracking-wide shadow-2xl mb-4 border border-white/10">
            {record.segments[previewIndex].speaker && (
              <span className="text-cyan-400 mr-2 font-bold">
                {record.segments[previewIndex].speaker}:
              </span>
            )}
            {record.segments[previewIndex].text}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
            disabled={previewIndex <= 0}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-xs rounded"
          >
            Prev Subtitle
          </button>
          <button
            onClick={() => setPreviewIndex((prev) => Math.min(record.segments.length - 1, prev + 1))}
            disabled={previewIndex >= record.segments.length - 1}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-xs rounded"
          >
            Next Subtitle
          </button>
        </div>
      </div>

      {/* Subtitles Timeline Editor Grid */}
      <div className="space-y-3">
        {record.segments.map((seg, idx) => {
          const isTooLong = seg.text.length > maxCharsPerLine;

          return (
            <div
              key={seg.id}
              onClick={() => setPreviewIndex(idx)}
              className={`p-4 rounded-xl border bg-white dark:bg-slate-900 transition-all ${
                previewIndex === idx
                  ? 'border-cyan-500 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2.5">
                {/* Number & Timing Display */}
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-mono text-xs font-bold text-slate-500">
                    {idx + 1}
                  </span>

                  <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-300">
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{seg.start}</span>
                    <span>&rarr;</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{seg.end}</span>
                  </div>

                  {/* Micro timing adjusters (+/- 0.5s) */}
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      onClick={() => handleAdjustTime(idx, 'startMs', -0.5)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                      title="Start 0.5s earlier"
                    >
                      -0.5s
                    </button>
                    <button
                      onClick={() => handleAdjustTime(idx, 'endMs', 0.5)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                      title="Extend 0.5s"
                    >
                      +0.5s
                    </button>
                  </div>
                </div>

                {/* Subtitle Management Controls: Split & Merge */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => handleSplitSegment(idx)}
                    className="p-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
                    title="Split subtitle block into two"
                  >
                    <Scissors className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Split</span>
                  </button>

                  <button
                    onClick={() => handleMergeNext(idx)}
                    disabled={idx >= record.segments.length - 1}
                    className="p-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
                    title="Merge with next subtitle block"
                  >
                    <Merge className="w-3.5 h-3.5 text-teal-500" />
                    <span>Merge</span>
                  </button>
                </div>
              </div>

              {/* Subtitle Text Input with Character Counter */}
              <div className="relative">
                <input
                  type="text"
                  value={seg.text}
                  onChange={(e) => {
                    const newText = e.target.value;
                    const updated = record.segments.map((s, i) => (i === idx ? { ...s, text: newText } : s));
                    onUpdateRecord({ ...record, segments: updated });
                  }}
                  className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 text-slate-900 dark:text-white pr-20 ${
                    isTooLong ? 'border-amber-400 dark:border-amber-600' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />

                <div
                  className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] tabular-nums ${
                    isTooLong ? 'text-amber-600 font-bold' : 'text-slate-400'
                  }`}
                >
                  {seg.text.length}/{maxCharsPerLine}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
