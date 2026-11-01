import React from 'react';
import { Waves, Shield, Heart, FileText, Mail } from 'lucide-react';
import { AppPage } from '../types';

interface FooterProps {
  onNavigate: (page: AppPage) => void;
  onOpenLegal: (tab: 'privacy' | 'terms' | 'contact') => void;
  onOpenInstall?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenLegal, onOpenInstall }) => {
  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-200/60 dark:border-slate-800/80">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center text-white shadow-sm">
                <Waves className="w-4 h-4" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                Transcripta<span className="text-cyan-500 font-black">AI</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Turn every video and audio recording into verbatim text, timed subtitles, and executive notes in seconds.
            </p>
          </div>

          {/* Solutions */}
          <div className="space-y-2.5 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Platform</h4>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400">
              <li>
                <button
                  onClick={() => onNavigate('upload')}
                  className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  AI Transcription
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  Project Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('pricing')}
                  className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  Plans & Pricing
                </button>
              </li>
              {onOpenInstall && (
                <li>
                  <button
                    onClick={onOpenInstall}
                    className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline transition-colors flex items-center gap-1.5"
                  >
                    <span>Download &amp; Install App</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950/80">All OS</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Features */}
          <div className="space-y-2.5 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Features</h4>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400">
              <li>
                <span className="hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer">
                  Speaker Diarization
                </span>
              </li>
              <li>
                <span className="hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer">
                  SRT & VTT Subtitle Editor
                </span>
              </li>
              <li>
                <span className="hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer">
                  30+ Language Translation
                </span>
              </li>
              <li>
                <span className="hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer">
                  10 AI Summary Frameworks
                </span>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="space-y-2.5 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Trust & Support</h4>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400">
              <li>
                <button
                  onClick={() => onOpenLegal('privacy')}
                  className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('terms')}
                  className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('contact')}
                  className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  Contact & Support
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span>Files processed securely through Google Gemini Flash. Zero model training on customer audio.</span>
          </div>

          <div>
            &copy; {new Date().getFullYear()} Transcripta AI. Turn Every Video Into Words.
          </div>
        </div>
      </div>
    </footer>
  );
};
