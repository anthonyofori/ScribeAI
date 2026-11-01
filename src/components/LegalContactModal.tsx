import React, { useState } from 'react';
import { X, Shield, FileText, Send, CheckCircle2, MessageSquare, Mail, Sparkles } from 'lucide-react';

interface LegalContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms' | 'contact';
}

export const LegalContactModal: React.FC<LegalContactModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'contact'>(initialTab);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTopic, setContactTopic] = useState('General Feedback');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail || !contactMessage) return;
    setIsSubmitted(true);
    setTimeout(() => {
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              {activeTab === 'privacy' && <Shield className="w-5 h-5" />}
              {activeTab === 'terms' && <FileText className="w-5 h-5" />}
              {activeTab === 'contact' && <Mail className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {activeTab === 'privacy' && 'Privacy Policy'}
                {activeTab === 'terms' && 'Terms of Service'}
                {activeTab === 'contact' && 'Contact Support & Enterprise'}
              </h2>
              <p className="text-xs text-slate-500">Transcripta AI Compliance & Communication Center</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 gap-6 text-xs font-semibold bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <button
            onClick={() => {
              setActiveTab('privacy');
              setIsSubmitted(false);
            }}
            className={`py-3 transition-colors relative ${
              activeTab === 'privacy'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => {
              setActiveTab('terms');
              setIsSubmitted(false);
            }}
            className={`py-3 transition-colors relative ${
              activeTab === 'terms'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => {
              setActiveTab('contact');
              setIsSubmitted(false);
            }}
            className={`py-3 transition-colors relative ${
              activeTab === 'contact'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Contact & Support
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-4">
          {activeTab === 'privacy' && (
            <>
              <div className="p-3 bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-900/50 rounded-xl text-cyan-900 dark:text-cyan-200">
                <p className="font-semibold mb-1">Zero Training & Strict Encryption Guarantee</p>
                <p>
                  Your audio, video, and resulting transcripts are never sold, rented, or used to train third-party machine learning models.
                </p>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-1">1. Information We Process</h3>
              <p>
                When you transcribe media on Transcripta AI, your audio or video file is streamed securely to Google Cloud infrastructure powered by the Gemini API. We process speech data exclusively to extract timestamps, diarize speakers, and deliver verbatim transcripts, subtitle tracks, and requested summaries.
              </p>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-1">2. Data Retention & Storage</h3>
              <p>
                Temporary media files uploaded to the server for processing are quarantined in encrypted volatile disk partitions and purged immediately upon pipeline completion. If you are signed in, your transcript records are saved in your private Cloud Firestore collection and accessible solely through your authenticated user ID.
              </p>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-1">3. Right to Erasure</h3>
              <p>
                You retain complete ownership over your transcribed content. You may permanently delete individual projects or wipe your entire transcription history at any time with a single click.
              </p>
            </>
          )}

          {activeTab === 'terms' && (
            <>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Permitted Use</h3>
              <p>
                Transcripta AI provides automated speech-to-text, translation, and analytical summarization tools for legal, educational, professional, and personal purposes. You agree not to upload content that violates applicable laws or infringes upon intellectual property rights.
              </p>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-1">2. Transcription Accuracy</h3>
              <p>
                While Gemini Flash delivers state-of-the-art multilingual acoustic diarization and verbatim recognition, speech recognition accuracy depends on background noise, acoustic fidelity, accents, and overlapping speakers. Users are encouraged to review critical legal or medical transcripts before publication.
              </p>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-1">3. Fair Quota Usage</h3>
              <p>
                Free tier accounts receive 60 complimentary minutes every calendar month. Pro and Business accounts receive expanded duration quotas. Automated batch scraping without valid API authentication tokens is prohibited.
              </p>
            </>
          )}

          {activeTab === 'contact' && (
            <div>
              {isSubmitted ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Thank you for reaching out!</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Our engineering and support team has received your message. We usually reply within 4 to 8 business hours.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="mt-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        placeholder="Alex Morgan"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="alex@domain.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Inquiry Topic
                    </label>
                    <select
                      value={contactTopic}
                      onChange={(e) => setContactTopic(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="General Feedback">General Feedback & Ideas</option>
                      <option value="Billing & Plans">Billing, Quotas & Invoices</option>
                      <option value="Enterprise API">High-Volume Enterprise API</option>
                      <option value="Bug Report">Technical Bug Report</option>
                      <option value="Privacy Question">Privacy & Data Compliance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Tell us what you need help with..."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Inquiry</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
