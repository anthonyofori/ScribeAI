import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What file formats and media types does Transcripta AI support?',
      a: 'Transcripta AI supports all standard video and audio formats: MP4, MOV, MP3, WAV, M4A, WebM, AAC, and OGG up to 200MB. You can also paste public YouTube video URLs directly or record live audio right from your microphone.',
    },
    {
      q: 'How does YouTube link transcription work?',
      a: 'Simply paste any public YouTube link (standard watch URL, youtu.be, or YouTube Shorts). Transcripta AI feeds the video directly to Gemini Flash’s native multimodal video pipeline to analyze speech and generate synchronized transcripts with speaker diarization without needing third-party downloaders.',
    },
    {
      q: 'Is my audio and video data kept private?',
      a: 'Yes, completely. Your media files are sent directly and securely to Google’s Gemini API exclusively for the purpose of transcription. Temporary server processing files are unlinked immediately after transcription completes, and your saved transcripts reside securely in Cloud Firestore and your browser.',
    },
    {
      q: 'How does speaker separation and diarization work?',
      a: 'When "Separate speakers" is enabled, the model analyzes voice pitch, cadence, and vocal timber across speech segments to label unique participants as Speaker 1, Speaker 2, etc. If speakers introduce themselves in the audio, the model can also assign their spoken names. You can also edit speaker names inline at any time.',
    },
    {
      q: 'What export subtitle formats can I use in video editors?',
      a: 'You can export SubRip (.srt) and WebVTT (.vtt) files with millisecond timecodes ready to import into Premiere Pro, Final Cut Pro, DaVinci Resolve, or YouTube Studio captions. You can also download clean Microsoft Word (.docx), PDF, or plain text (.txt) documents.',
    },
    {
      q: 'Which languages are supported?',
      a: 'Transcripta AI supports auto-detection and transcription in over 30 world languages including English, Spanish, French, Akan (Twi), German, Arabic, Mandarin Chinese, Hindi, Portuguese, Japanese, Korean, Italian, Russian, Swahili, Yoruba, and more.',
    },
  ];

  return (
    <section id="faq" className="py-16 sm:py-24 border-t border-slate-200/70 dark:border-slate-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2">
            Frequently Asked Questions
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Common Questions About Transcripta AI
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Everything you need to know about processing media, privacy, and exporting.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-semibold text-sm text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
