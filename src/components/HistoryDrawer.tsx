import React, { useState } from 'react';
import { History, X, Trash2, Edit2, Play, Search, Clock, FileAudio, Youtube, Mic, Check } from 'lucide-react';
import { TranscriptRecord } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: TranscriptRecord[];
  onSelectRecord: (record: TranscriptRecord) => void;
  onUpdateRecord: (id: string, updates: Partial<TranscriptRecord>) => void;
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectRecord,
  onUpdateRecord,
  onDeleteRecord,
  onClearAll,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) =>
    item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.language.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const startRename = (item: TranscriptRecord) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  const saveRename = (id: string) => {
    if (editingTitle.trim()) {
      onUpdateRecord(id, { title: editingTitle.trim() });
    }
    setEditingId(null);
  };

  const getSourceIcon = (type: string) => {
    if (type === 'youtube') return <Youtube className="w-3.5 h-3.5 text-red-500" />;
    if (type === 'record') return <Mic className="w-3.5 h-3.5 text-emerald-500" />;
    return <FileAudio className="w-3.5 h-3.5 text-cyan-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Transcription History
              </h2>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                ({history.length})
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search history by title..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-16 space-y-2 text-slate-400">
                <History className="w-10 h-10 mx-auto opacity-40" />
                <p className="text-xs">
                  {history.length === 0
                    ? 'No saved transcripts yet. Start a new transcription!'
                    : 'No transcripts match your search.'}
                </p>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="group relative p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm hover:border-cyan-400 dark:hover:border-cyan-700 transition-all"
                >
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename(item.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 text-xs px-2 py-1 bg-white dark:bg-slate-900 border border-cyan-500 rounded text-slate-900 dark:text-white"
                      />
                      <button
                        onClick={() => saveRename(item.id)}
                        className="p-1 text-xs text-white bg-cyan-600 rounded hover:bg-cyan-500"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Top line with title and actions */}
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          onClick={() => {
                            onSelectRecord(item);
                            onClose();
                          }}
                          className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400"
                          title="Open transcript"
                        >
                          {item.title}
                        </h3>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startRename(item)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Rename"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteRecord(item.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Clean metadata strip */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                        <div className="flex items-center gap-1">
                          {getSourceIcon(item.sourceType)}
                          <span className="capitalize">{item.sourceType}</span>
                        </div>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{item.duration}</span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Snippet preview */}
                      <p
                        onClick={() => {
                          onSelectRecord(item);
                          onClose();
                        }}
                        className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-2 cursor-pointer"
                      >
                        {item.fullText || item.segments.map((s) => s.text).join(' ')}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer with Clear All */}
          {history.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              {confirmClear ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">Delete all history?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onClearAll();
                        setConfirmClear(false);
                      }}
                      className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded font-medium"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All History</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
