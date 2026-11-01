import React, { useState } from 'react';
import {
  Waves,
  Moon,
  Sun,
  History,
  Sparkles,
  ArrowRight,
  User,
  LayoutDashboard,
  Settings,
  CreditCard,
  LogOut,
  ChevronDown,
  Upload,
  Menu,
  X,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AppPage, UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  userProfile: UserProfile | null;
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onOpenProfile: () => void;
  onNewTranscription: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  onToggleDarkMode,
  onOpenHistory,
  historyCount,
  userProfile,
  currentPage,
  onNavigate,
  onOpenAuth,
  onOpenProfile,
  onNewTranscription,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUserDropdownOpen(false);
      onNavigate('landing');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark & Tagline */}
        <div
          className="flex items-center gap-3 shrink-0 cursor-pointer group"
          onClick={() => onNavigate('landing')}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center text-white shadow-sm shadow-cyan-500/25 group-hover:scale-105 transition-transform">
            <Waves className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Transcripta<span className="text-cyan-500 font-black">AI</span>
              </span>
              <span className="hidden lg:inline-block text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300">
                PRO
              </span>
            </div>
            <span className="hidden sm:inline-block text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-1 tracking-tight">
              Turn Every Video Into Words
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <button
            onClick={() => onNavigate('landing')}
            className={`transition-colors hover:text-cyan-600 dark:hover:text-cyan-400 ${
              currentPage === 'landing' ? 'text-cyan-600 dark:text-cyan-400 font-bold' : ''
            }`}
          >
            Home
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className={`transition-colors hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1.5 ${
              currentPage === 'dashboard' ? 'text-cyan-600 dark:text-cyan-400 font-bold' : ''
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('upload')}
            className={`transition-colors hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1.5 ${
              currentPage === 'upload' ? 'text-cyan-600 dark:text-cyan-400 font-bold' : ''
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Transcribe</span>
          </button>

          <button
            onClick={() => onNavigate('pricing')}
            className={`transition-colors hover:text-cyan-600 dark:hover:text-cyan-400 ${
              currentPage === 'pricing' ? 'text-cyan-600 dark:text-cyan-400 font-bold' : ''
            }`}
          >
            Pricing & Quotas
          </button>
        </nav>

        {/* Zone 3: Actions & User Account */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* PWA Install Button (Cross-platform) */}
          <PWAInstallButton variant="nav" />

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="h-9 px-2.5 sm:px-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 text-xs font-medium"
            title="Transcription History"
            aria-label="Open History"
          >
            <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden xl:inline">History</span>
            {historyCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-cyan-500 rounded-full tabular-nums">
                {historyCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Auth or Profile Button */}
          {userProfile ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="h-9 inline-flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-semibold"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-400 text-white flex items-center justify-center font-bold text-[11px]">
                  {userProfile.displayName?.charAt(0).toUpperCase() || userProfile.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1 max-w-[100px] leading-tight">
                    {userProfile.displayName || userProfile.email.split('@')[0]}
                  </span>
                  <span className="text-[9px] text-cyan-600 dark:text-cyan-400 capitalize font-medium leading-none">
                    {userProfile.plan} plan
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {userProfile.displayName || 'Signed In'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{userProfile.email}</p>
                    <div className="mt-1.5 text-[10px] font-semibold text-cyan-600 dark:text-cyan-400">
                      {userProfile.transcriptionMinutesUsed} / {userProfile.transcriptionMinutesLimit} min used
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('dashboard');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>My Dashboard</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenProfile();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Profile & API Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('pricing');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Subscription & Plans</span>
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => onOpenAuth('signin')}
                className="h-9 px-3 sm:px-3.5 inline-flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors leading-none"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="h-9 px-3.5 sm:px-4 inline-flex items-center justify-center text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-xs shadow-cyan-600/30 transition-all leading-none"
              >
                Get Started
              </button>
            </div>
          )}

          {/* New Project CTA */}
          <button
            onClick={onNewTranscription}
            className="hidden lg:inline-flex items-center justify-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-xl shadow-xs transition-all leading-none"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>New Video</span>
          </button>

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 pt-2 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-1 text-sm font-semibold">
            <button
              onClick={() => {
                onNavigate('landing');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                currentPage === 'landing'
                  ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Home</span>
              <span className="text-xs text-slate-400">&rarr;</span>
            </button>

            <button
              onClick={() => {
                onNavigate('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                currentPage === 'dashboard'
                  ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-cyan-500" />
                <span>My Dashboard</span>
              </div>
              <span className="text-xs text-slate-400">&rarr;</span>
            </button>

            <button
              onClick={() => {
                onNavigate('upload');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                currentPage === 'upload'
                  ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-cyan-500" />
                <span>Transcribe Media</span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
                Fast
              </span>
            </button>

            <button
              onClick={() => {
                onNavigate('pricing');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                currentPage === 'pricing'
                  ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-teal-500" />
                <span>Pricing &amp; Quotas</span>
              </div>
              <span className="text-xs text-slate-400">&rarr;</span>
            </button>

            <button
              onClick={() => {
                onOpenHistory();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-between p-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4 text-amber-500" />
                <span>History Drawer</span>
              </div>
              {historyCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-cyan-500">
                  {historyCount}
                </span>
              )}
            </button>

            {/* Mobile PWA Install CTA */}
            <div className="pt-1">
              <PWAInstallButton variant="mobile" />
            </div>
          </nav>

          {/* Quick CTA on Mobile */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <button
              onClick={() => {
                onNewTranscription();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Start New Transcription</span>
            </button>

            {!userProfile && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    onOpenAuth('signin');
                    setMobileMenuOpen(false);
                  }}
                  className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onOpenAuth('signup');
                    setMobileMenuOpen(false);
                  }}
                  className="h-10 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center shadow-xs transition-colors"
                >
                  Get Started
                </button>
              </div>
            )}

            {userProfile && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {userProfile.displayName || userProfile.email}
                  </p>
                  <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium capitalize">
                    {userProfile.plan} plan · {userProfile.transcriptionMinutesUsed}/{userProfile.transcriptionMinutesLimit}m
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
