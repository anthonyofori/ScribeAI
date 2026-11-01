import React, { useState } from 'react';
import {
  User,
  Mail,
  Shield,
  Clock,
  Sparkles,
  Key,
  Globe,
  FileCode,
  LogOut,
  X,
  Check,
  Copy,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createOrUpdateUserProfile } from '../lib/firestoreProjects';
import { SubscriptionPlan, SUPPORTED_LANGUAGES, UserProfile } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onProfileUpdated: (updated: UserProfile) => void;
  onNavigatePricing: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
  onNavigatePricing,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'usage' | 'api'>('profile');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [defaultLang, setDefaultLang] = useState(userProfile?.defaultLanguage || 'auto');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [apiKey] = useState(() => 'tra_live_' + Math.random().toString(36).substring(2, 14) + Date.now().toString(36));

  if (!isOpen) return null;

  const usedMinutes = userProfile?.transcriptionMinutesUsed ?? 0;
  const limitMinutes = userProfile?.transcriptionMinutesLimit ?? 60;
  const pct = Math.min(100, Math.round((usedMinutes / limitMinutes) * 100));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setIsSaving(true);
    try {
      const updated = await createOrUpdateUserProfile({
        uid: userProfile.uid,
        email: userProfile.email,
        displayName: displayName.trim() || userProfile.displayName,
        defaultLanguage: defaultLang,
      });
      onProfileUpdated(updated);
      onClose();
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-cyan-500/20">
            {userProfile?.displayName?.charAt(0).toUpperCase() || userProfile?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {userProfile?.displayName || userProfile?.email?.split('@')[0] || 'User Profile'}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
                {userProfile?.plan || 'Free'} Plan
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{userProfile?.email}</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 transition-colors relative ${
              activeTab === 'profile'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Profile & Settings
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`pb-2.5 transition-colors relative ${
              activeTab === 'usage'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Transcription Quota
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`pb-2.5 transition-colors relative ${
              activeTab === 'api'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            API Access
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name or handle"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  disabled
                  value={userProfile?.email || ''}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Managed via Firebase Authentication</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Spoken Language
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={defaultLang}
                  onChange={(e) => setDefaultLang(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} {lang.nativeName ? `(${lang.nativeName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl shadow-xs"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'usage' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Monthly Usage</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                  {usedMinutes} / {limitMinutes} min ({pct}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  style={{ width: `${pct}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct > 85 ? 'bg-amber-500' : 'bg-cyan-500'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Resets on the 1st of every month</span>
                <span>{Math.max(0, limitMinutes - usedMinutes)} min available</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-cyan-200 dark:border-cyan-900/40 bg-cyan-50/50 dark:bg-cyan-950/20 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Need higher throughput?</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Pro and Business plans unlock 300 to 1,200 minutes and priority Gemini processing.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onNavigatePricing();
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg shadow-xs flex items-center gap-1 shrink-0"
              >
                <span>Upgrade</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Personal API Secret Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  readOnly
                  value={apiKey}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(apiKey);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Authenticate programmatically with <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Authorization: Bearer tra_live_...</code>
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-2 border border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-900 dark:text-white">cURL Example</span>
              <pre className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 overflow-x-auto p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
{`curl -X POST /api/transcribe \\
  -H "Authorization: Bearer ${apiKey.substring(0, 16)}..." \\
  -F "mediaFile=@recording.mp3" \\
  -F "sourceLanguage=auto"`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
