import React, { useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  Subtitles,
  Sparkles,
  Download,
  Languages,
  User,
  Clock,
  Check,
  Search,
  Sliders,
} from 'lucide-react';

export const InteractiveEditorDemo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'editor' | 'subtitles' | 'summary'>('editor');

  const demoSegments = [
    {
      time: '00:02',
      speaker: 'Speaker 1',
      role: 'Host',
      text: 'Welcome back everyone. Today we are discussing how multimodal AI models are transforming video localization and speech transcription.',
    },
    {
      time: '00:08',
      speaker: 'Speaker 2',
      role: 'Engineer',
      text: 'Exactly. Rather than just acoustic phonetics, Gemini understands context, accents, and overlapping dialogues with millisecond precision.',
    },
    {
      time: '00:16',
      speaker: 'Speaker 1',
      role: 'Host',
      text: 'And what about subtitle files for video editors? Generating accurate SRT and WebVTT tracks automatically saves hours of manual sync.',
    },
    {
      time: '00:23',
      speaker: 'Speaker 2',
      role: 'Engineer',
      text: 'Not only SRT subtitles, but also full markdown summaries, action checklists, and instant translations into over 30 languages.',
    },
  ];

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100/80 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Interactive Preview</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          See the Workspace & Subtitle Studio in Action
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
          Experience synchronized audio playback, one-click speaker renaming, and timecode alignment before you transcribe.
        </p>
      </div>

      {/* Editor Mockup Window */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        {/* Window Chrome Top Bar */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-amber-400/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
            </div>
            <span className="ml-2 font-mono text-xs font-medium text-slate-600 dark:text-slate-400 hidden sm:inline">
              ai_podcast_episode_42.mp4 · 00:30 · 1080p
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'editor'
                  ? 'bg-cyan-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Transcript Editor
            </button>
            <button
              onClick={() => setActiveTab('subtitles')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'subtitles'
                  ? 'bg-cyan-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Subtitle Blocks
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'summary'
                  ? 'bg-cyan-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              AI Notes
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Media Player Simulation */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden flex flex-col justify-between p-4 border border-slate-800">
              <div className="flex items-center justify-between text-white/70 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/50 backdrop-blur-xs font-mono">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>{demoSegments[activeSegmentIndex].time} / 00:30</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                  Syncing
                </span>
              </div>

              {/* Subtitle Overlay */}
              <div className="text-center px-4 py-2 bg-black/75 backdrop-blur-sm rounded-lg mx-auto max-w-sm">
                <p className="text-xs sm:text-sm font-semibold text-yellow-300 drop-shadow-md">
                  {demoSegments[activeSegmentIndex].text}
                </p>
              </div>

              {/* Player Controls Bar */}
              <div className="flex items-center justify-between gap-3 text-white text-xs pt-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center transition-colors shadow-sm"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                {/* Waveform graphic */}
                <div className="flex-1 flex items-center gap-0.5 h-6">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        height: `${Math.sin(i * 0.4) * 45 + 50}%`,
                      }}
                      className={`flex-1 rounded-full transition-colors ${
                        i <= activeSegmentIndex * 8 ? 'bg-cyan-400' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <Volume2 className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Click any dialogue line to scrub video
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                <Check className="w-3.5 h-3.5" />
                <span>Auto-saved to Cloud</span>
              </div>
            </div>
          </div>

          {/* Right Interactive Segment List */}
          <div className="lg:col-span-7">
            {activeTab === 'editor' && (
              <div className="space-y-3">
                {demoSegments.map((seg, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveSegmentIndex(idx)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      activeSegmentIndex === idx
                        ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-600 dark:text-cyan-400 text-[11px] font-semibold bg-cyan-100/70 dark:bg-cyan-950/60 px-1.5 py-0.5 rounded">
                          {seg.time}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {seg.speaker}
                        </span>
                        <span className="text-[10px] text-slate-400">({seg.role})</span>
                      </div>
                      <span className="text-[10px] text-slate-400">100% confidence</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                      {seg.text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'subtitles' && (
              <div className="space-y-3 font-mono text-xs">
                {demoSegments.map((seg, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">#{idx + 1}</span>
                      <span>{seg.time},000 --&gt; 00:{String((idx + 1) * 7).padStart(2, '0')},000</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Valid SubRip</span>
                    </div>
                    <div className="text-slate-900 dark:text-white font-sans text-xs bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                      &lt;v {seg.speaker}&gt;{seg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <Sparkles className="w-4 h-4 text-cyan-500" />
                  <span>Executive AI Digest</span>
                </div>
                <p>
                  <strong>Core Thesis:</strong> Next-generation multimodal AI models like Gemini Flash process audio acoustics directly, eliminating traditional speech synthesis bottlenecks and providing synchronized subtitle timecodes.
                </p>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">Action Items:</span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                    <li>Export multi-track SRT subtitle files for YouTube localization</li>
                    <li>Generate study guides and key metric takeaways automatically</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
