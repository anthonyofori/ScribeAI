import React from 'react';
import { Upload, Cpu, Download } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Import Media or Record',
      desc: 'Drag & drop any video or audio file (MP4, MP3, WAV, WebM), paste a public YouTube link, or record directly with your microphone.',
      icon: <Upload className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
    },
    {
      num: '02',
      title: 'Gemini Flash AI Processing',
      desc: 'Google Gemini Flash analyzes speech acoustics, identifies distinct speakers, inserts precise timestamps, and handles 30+ world languages verbatim.',
      icon: <Cpu className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
    },
    {
      num: '03',
      title: 'Export, Translate & Chat',
      desc: 'Download subtitles (SRT/VTT) for video editors, generate executive notes, translate into other languages, or query details in grounded interactive chat.',
      icon: <Download className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-24 border-t border-slate-200/70 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2">
            Simple 3-Step Workflow
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white" style={{ textWrap: 'balance' }}>
            From Audio to Accurate Text in Seconds
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2.5">
            Designed for researchers, podcasters, students, and creators who need fast, verbatim transcripts without signups or paywalls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative group hover:border-cyan-400 dark:hover:border-cyan-600 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 flex items-center justify-center">
                  {step.icon}
                </div>
                <span className="font-mono text-sm font-bold text-slate-300 dark:text-slate-700 tabular-nums">
                  {step.num}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                {step.title}
              </h3>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
