import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallAppModal } from './InstallAppModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'nav' | 'cta' | 'mobile';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'nav',
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already running inside standalone installed window, hide button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    // If native prompt is available (Chrome, Edge, Android Chrome), try prompt first
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      {variant === 'nav' && (
        <button
          onClick={handleClick}
          className={`h-9 px-3 rounded-xl border border-cyan-500/40 bg-cyan-50/50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 transition-colors inline-flex items-center gap-1.5 text-xs font-semibold leading-none shrink-0 ${className}`}
          title="Download & Install App"
          aria-label="Download & Install App"
        >
          <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      )}

      {variant === 'mobile' && (
        <button
          onClick={handleClick}
          className={`w-full py-2.5 px-3 rounded-xl border border-cyan-500/30 bg-cyan-50/60 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 font-semibold text-xs flex items-center justify-between transition-colors ${className}`}
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-cyan-500" />
            <span>Install App on Phone / Desktop</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-200/60 dark:bg-cyan-900/80 text-cyan-800 dark:text-cyan-200">
            PWA
          </span>
        </button>
      )}

      {variant === 'cta' && (
        <button
          onClick={handleClick}
          className={`h-11 px-5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm inline-flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>Download App</span>
        </button>
      )}

      {/* Cross-Platform Download & Install Modal */}
      <InstallAppModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
