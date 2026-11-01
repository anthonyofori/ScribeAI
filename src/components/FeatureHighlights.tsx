import React from 'react';
import { Users, FileCheck2, Globe2, Sparkles, CheckCircle2 } from 'lucide-react';

export const FeatureHighlights: React.FC = () => {
  return (
    <section id="features" className="py-16 sm:py-24 border-t border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2">
            Engineered for Precision
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white" style={{ textWrap: 'balance' }}>
            Everything You Need in a Modern Transcription Suite
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            No limits, no robotic summaries. True verbatim speech recognition powered by Gemini Flash multimodal architecture.
          </p>
        </div>

        {/* Feature 1: Speaker Recognition */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-3 py-1 rounded-lg">
              <Users className="w-4 h-4" />
              <span>Multi-Speaker Diarization</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white" style={{ textWrap: 'balance' }}>
              Automatic Speaker Separation & Identification
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Interviews, podcasts, and board meetings feature multiple overlapping voices. Transcripta AI automatically distinguishes between Speaker 1, Speaker 2, and more, or captures actual names when introduced.
            </p>
            <ul className="space-y-2 pt-2 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>Precise speaker switches with synced timecodes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>Rename speakers with one click across the entire transcript</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>Export directly to SRT and WebVTT with speaker voice tags</span>
              </li>
            </ul>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-slate-900">
            <img
              src="/src/assets/images/feature_speakers_1792091130618.jpg"
              alt="Speaker Diarization Visualizer"
              referrerPolicy="no-referrer"
              className="w-full h-auto object-cover aspect-4/3"
            />
          </div>
        </div>

        {/* Feature 2: Smart Notes & Key Action Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center lg:flex-row-reverse">
          <div className="order-2 lg:order-1 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-slate-900">
            <img
              src="/src/assets/images/feature_notes_1792091132057.jpg"
              alt="Smart Summary and Action Items"
              referrerPolicy="no-referrer"
              className="w-full h-auto object-cover aspect-4/3"
            />
          </div>

          <div className="order-1 lg:order-2 space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-3 py-1 rounded-lg">
              <FileCheck2 className="w-4 h-4" />
              <span>Intelligent Synthesis</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white" style={{ textWrap: 'balance' }}>
              Action Items, Executive Summaries & Study Notes
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Don’t spend hours skimming hours of transcripts. Choose between 4 curated note modes to generate structured markdown digests, actionable decision checklists, or study guides in seconds.
            </p>
            <ul className="space-y-2 pt-2 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>Executive Smart Summaries with key discussion themes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>Action item checklists with responsible owners and commitments</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>Study notes with conceptual definitions and self-test review questions</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Feature 3: Global Multilingual Support */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-3 py-1 rounded-lg">
              <Globe2 className="w-4 h-4" />
              <span>30+ Global Languages</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white" style={{ textWrap: 'balance' }}>
              Accurate Transcription in English, Twi, Spanish, Arabic & More
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Trained on extensive world languages and accents, Gemini recognizes colloquial nuances and domain vocabulary. Translate any transcript into another language with preserved timecodes.
            </p>
            <ul className="space-y-2 pt-2 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>Auto-detection or manual selection for 33+ international languages</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>One-click full transcript translation preserving subtitle sync</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>Specialized handling for dialects including Akan (Twi), Yoruba, and Swahili</span>
              </li>
            </ul>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-slate-900">
            <img
              src="/src/assets/images/hero_soundwave_workspace_1792091130788.jpg"
              alt="High-performance Audio Engine"
              referrerPolicy="no-referrer"
              className="w-full h-auto object-cover aspect-16/9"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
