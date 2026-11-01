import React, { useState } from 'react';
import {
  X,
  Download,
  Share2,
  Check,
  Smartphone,
  Laptop,
  Monitor,
  Apple,
  ExternalLink,
  ShieldCheck,
  Zap,
  Wifi,
} from 'lucide-react';
import { usePWAInstall, PlatformType } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, platform, install } = usePWAInstall();
  const [selectedTab, setSelectedTab] = useState<PlatformType>(
    platform === 'other' ? 'android' : platform
  );
  const [copied, setCopied] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Transcripta AI - Turn Every Video Into Words',
          text: 'Download Transcripta AI on your phone or desktop for high-speed video transcription and summaries!',
          url: currentUrl,
        });
      } catch {
        // User cancelled or unsupported
      }
    } else {
      handleCopyLink();
    }
  };

  const handleInstallClick = async () => {
    setInstalling(true);
    const success = await install();
    setInstalling(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close download modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-400 p-0.5 shadow-lg shadow-cyan-500/20 shrink-0 flex items-center justify-center">
            <img
              src="/pwa-192x192.png"
              alt="Transcripta AI Icon"
              className="w-full h-full object-cover rounded-[14px]"
              onError={(e) => {
                // Fallback to SVG if png not yet cached
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 text-[11px] font-bold mb-1">
              <Zap className="w-3 h-3 text-cyan-500" />
              <span>Progressive Web App (PWA)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Download Transcripta AI
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Install as a standalone native app on Android, iPhone, Windows PC, or Mac OS.
            </p>
          </div>
        </div>

        {/* Direct One-Click Install CTA (Available when browser supports beforeinstallprompt) */}
        {isInstallable && !isInstalled && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-600/10 via-teal-600/10 to-transparent border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left">
              <p className="text-xs font-bold text-cyan-700 dark:text-cyan-300">
                Direct One-Click Install Ready!
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Your browser is ready to install Transcripta directly to your device.
              </p>
            </div>
            <button
              onClick={handleInstallClick}
              disabled={installing}
              className="w-full sm:w-auto h-10 px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/30 transition-all shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{installing ? 'Installing...' : 'Install App Now'}</span>
            </button>
          </div>
        )}

        {isInstalled && (
          <div className="mb-6 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>Transcripta AI is already installed on this device in standalone mode!</span>
          </div>
        )}

        {/* Platform Selection Tabs */}
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Choose Your Device Platform:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Android Tab */}
            <button
              onClick={() => setSelectedTab('android')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                selectedTab === 'android'
                  ? 'border-cyan-500 bg-cyan-50/80 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-500" />
              <span>Android Phone</span>
            </button>

            {/* iPhone Tab */}
            <button
              onClick={() => setSelectedTab('ios')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                selectedTab === 'ios'
                  ? 'border-cyan-500 bg-cyan-50/80 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Apple className="w-4 h-4 text-slate-800 dark:text-slate-200" />
              <span>iPhone &amp; iPad</span>
            </button>

            {/* Windows Tab */}
            <button
              onClick={() => setSelectedTab('windows')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                selectedTab === 'windows'
                  ? 'border-cyan-500 bg-cyan-50/80 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Monitor className="w-4 h-4 text-blue-500" />
              <span>Windows PC</span>
            </button>

            {/* Mac OS Tab */}
            <button
              onClick={() => setSelectedTab('mac')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                selectedTab === 'mac'
                  ? 'border-cyan-500 bg-cyan-50/80 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Laptop className="w-4 h-4 text-purple-500" />
              <span>Mac OS</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step Instructions Container */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 mb-6 text-xs text-slate-700 dark:text-slate-300 space-y-3">
          {selectedTab === 'android' && (
            <>
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                <Smartphone className="w-4 h-4 text-emerald-500" />
                <span>How to Install on Android (Samsung, Pixel, Xiaomi, etc.)</span>
              </div>
              <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                <li>
                  Open this link in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong>.
                </li>
                <li>
                  Tap the <strong>&ldquo;Install App&rdquo;</strong> button above, or tap the <strong>three dots (&hellip;)</strong> menu in the top right corner.
                </li>
                <li>
                  Tap <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.
                </li>
                <li>
                  Confirm <strong>&ldquo;Install&rdquo;</strong>. The app icon will appear on your home screen and app drawer with instant full-screen access!
                </li>
              </ol>
            </>
          )}

          {selectedTab === 'ios' && (
            <>
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                <Apple className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                <span>How to Install on iPhone &amp; iPad</span>
              </div>
              <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                <li>
                  Open this link in <strong>Safari</strong> on your iPhone or iPad.
                </li>
                <li>
                  Tap the <strong>Share button</strong>{' '}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[11px] font-bold">
                    <ExternalLink className="w-3 h-3 inline mr-1" /> Share icon
                  </span>{' '}
                  at the bottom of the screen.
                </li>
                <li>
                  Scroll down the share sheet and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                </li>
                <li>
                  Tap <strong>&ldquo;Add&rdquo;</strong> in the top-right corner. Transcripta AI will launch full-screen without any browser address bar!
                </li>
              </ol>
            </>
          )}

          {selectedTab === 'windows' && (
            <>
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                <Monitor className="w-4 h-4 text-blue-500" />
                <span>How to Install on Windows 10 &amp; 11</span>
              </div>
              <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                <li>
                  Open this link in <strong>Microsoft Edge</strong> or <strong>Google Chrome</strong>.
                </li>
                <li>
                  Click the <strong>App Available / Install</strong> icon in the right side of the address bar, or click <strong>&ldquo;Install App Now&rdquo;</strong> above.
                </li>
                <li>
                  Click <strong>&ldquo;Install&rdquo;</strong> in the popup prompt.
                </li>
                <li>
                  Transcripta opens in its own desktop window and can be pinned to your <strong>Windows Taskbar</strong> and <strong>Start Menu</strong>!
                </li>
              </ol>
            </>
          )}

          {selectedTab === 'mac' && (
            <>
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                <Laptop className="w-4 h-4 text-purple-500" />
                <span>How to Install on Mac OS (Sonoma, Ventura, Monterey)</span>
              </div>
              <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                <li>
                  <strong>In Safari (macOS Sonoma+):</strong> Click <strong>File &gt; Add to Dock</strong> in the top menu bar, then click <strong>Add</strong>.
                </li>
                <li>
                  <strong>In Google Chrome:</strong> Click the <strong>Install icon</strong> in the address bar (or Chrome menu &gt; Save and Share &gt; Install Transcripta AI).
                </li>
                <li>
                  Transcripta appears in your <strong>Mac Dock</strong> and <strong>Launchpad</strong>, opening as an independent macOS desktop app!
                </li>
              </ol>
            </>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-cyan-500" /> Offline cache enabled
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secure PWA sandbox
            </span>
          </div>
        </div>

        {/* Share Link Section */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-cyan-500" />
              <span>Share Link to Someone:</span>
            </p>
            {copied && (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Copied to clipboard!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="flex-1 h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-mono truncate select-all focus:outline-hidden"
            />
            <button
              onClick={handleCopyLink}
              className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
            <button
              onClick={handleNativeShare}
              className="h-9 px-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 shrink-0 shadow-xs shadow-cyan-600/30 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
