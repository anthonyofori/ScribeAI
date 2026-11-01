import React, { useState } from 'react';
import {
  Upload,
  Search,
  Plus,
  Clock,
  FileVideo,
  FileAudio,
  Youtube,
  Mic,
  MoreVertical,
  Trash2,
  Edit2,
  ExternalLink,
  Sparkles,
  Subtitles,
  Download,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { TranscriptRecord, UserProfile } from '../types';
import { exportToSrt, exportToTxt, exportToVtt } from '../utils/exporters';

interface DashboardPageProps {
  userProfile: UserProfile | null;
  projects: TranscriptRecord[];
  onOpenProject: (record: TranscriptRecord) => void;
  onNewUpload: () => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newTitle: string) => void;
  onUpgradeClick: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  userProfile,
  projects,
  onOpenProject,
  onNewUpload,
  onDeleteProject,
  onRenameProject,
  onUpgradeClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const usedMinutes = userProfile?.transcriptionMinutesUsed ?? 0;
  const totalMinutes = userProfile?.transcriptionMinutesLimit ?? 60;
  const usagePercentage = Math.min(100, Math.round((usedMinutes / totalMinutes) * 100));

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.language.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'completed') return matchesSearch && (p.status === 'completed' || !p.status);
    if (statusFilter === 'processing') return matchesSearch && p.status === 'processing';
    return matchesSearch;
  });

  const getSourceIcon = (sourceType: string) => {
    if (sourceType === 'youtube') return <Youtube className="w-4 h-4 text-red-500" />;
    if (sourceType === 'record') return <Mic className="w-4 h-4 text-emerald-500" />;
    return <FileVideo className="w-4 h-4 text-cyan-500" />;
  };

  const startRename = (p: TranscriptRecord) => {
    setEditingId(p.id);
    setRenameInput(p.title);
  };

  const saveRename = (id: string) => {
    if (renameInput.trim()) {
      onRenameProject(id, renameInput.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome & Quota Overview Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Welcome Card */}
        <div className="md:col-span-2 bg-gradient-to-tr from-cyan-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-md border border-cyan-800/40">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold">
              <span className="capitalize">{userProfile?.plan || 'Free'} Plan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {userProfile?.displayName || userProfile?.email?.split('@')[0] || 'Creator'}
            </h1>
            <p className="text-xs sm:text-sm text-cyan-100/80 max-w-xl leading-relaxed">
              Transform meetings, interviews, YouTube videos, and podcasts into verbatim text, timed subtitles, and executive notes.
            </p>
            <div className="pt-2">
              <button
                onClick={onNewUpload}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Transcription Project</span>
              </button>
            </div>
          </div>
        </div>

        {/* Usage Quota Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              <span>Monthly Minutes Quota</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400">{usedMinutes} / {totalMinutes}m</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
              <div
                style={{ width: `${usagePercentage}%` }}
                className={`h-full transition-all duration-500 rounded-full ${
                  usagePercentage > 85 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {Math.max(0, totalMinutes - usedMinutes)} minutes remaining in this billing cycle.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Need more minutes?</span>
            <button
              onClick={onUpgradeClick}
              className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>Upgrade Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Projects Management Section */}
      <div className="space-y-4">
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search past projects by title or language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Status Segmented Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-end sm:self-auto text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All Projects ({projects.length})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Projects Cards List */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 p-6">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {projects.length === 0 ? 'No transcription projects yet' : 'No matching projects found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {projects.length === 0
                ? 'Drop an audio or video file, paste a YouTube link, or record with your microphone to start.'
                : 'Try modifying your search keywords or filter options.'}
            </p>
            {projects.length === 0 && (
              <button
                onClick={onNewUpload}
                className="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                Create Your First Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-600 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar with Icon, Source and Rename */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        {getSourceIcon(p.sourceType)}
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {p.sourceType}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startRename(p)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteProject(p.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Date */}
                  {editingId === p.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename(p.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 text-xs px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-cyan-500 rounded"
                      />
                      <button
                        onClick={() => saveRename(p.id)}
                        className="px-2 py-1 text-xs bg-cyan-600 text-white rounded font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h3
                        onClick={() => onOpenProject(p)}
                        className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer"
                        title={p.title}
                      >
                        {p.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <span className="font-mono tabular-nums">{p.duration}</span>
                        <span aria-hidden="true">·</span>
                        <span>{p.language}</span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Snippet Preview */}
                  <p
                    onClick={() => onOpenProject(p)}
                    className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed cursor-pointer"
                  >
                    {p.fullText || p.segments.map((s) => s.text).join(' ')}
                  </p>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => onOpenProject(p)}
                    className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>Open Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportToSrt(p)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      title="Download SRT Subtitle"
                    >
                      SRT
                    </button>
                    <button
                      onClick={() => exportToTxt(p)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      title="Download TXT"
                    >
                      TXT
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
