import React, { useState, useEffect } from 'react';
import {
  Zap,
  Globe2,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  Upload,
  Download,
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  createOrUpdateUserProfile,
  deleteProjectFromFirestore,
  fetchUserProjectsFromFirestore,
  getUserProfile,
  incrementUserUsage,
  saveProjectToFirestore,
} from './lib/firestoreProjects';
import { AppPage, SubscriptionPlan, TranscriptRecord, UserProfile } from './types';
import {
  clearAllHistory,
  deleteTranscriptFromHistory,
  getStoredTranscripts,
  saveTranscriptToHistory,
  updateTranscriptInHistory,
} from './utils/history';

// UI Components
import { Navbar } from './components/Navbar';
import { TranscriptionCard } from './components/TranscriptionCard';
import { DashboardPage } from './components/DashboardPage';
import { TranscriptionWorkspace } from './components/TranscriptionWorkspace';
import { SubtitleEditor } from './components/SubtitleEditor';
import { SummarizationWorkspace } from './components/SummarizationWorkspace';
import { SubscriptionUsagePage } from './components/SubscriptionUsagePage';
import { InteractiveEditorDemo } from './components/InteractiveEditorDemo';
import { HowItWorks } from './components/HowItWorks';
import { FeatureHighlights } from './components/FeatureHighlights';
import { PricingSection } from './components/PricingSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { HistoryDrawer } from './components/HistoryDrawer';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { LegalContactModal } from './components/LegalContactModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { InstallAppModal } from './components/InstallAppModal';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('transcripta_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Current page state
  const [currentPage, setCurrentPage] = useState<AppPage>('landing');

  // Active transcription record for workspaces
  const [currentRecord, setCurrentRecord] = useState<TranscriptRecord | null>(null);

  // User Profile from Firebase
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Projects list
  const [projects, setProjects] = useState<TranscriptRecord[]>([]);

  // Modals
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms' | 'contact'>('privacy');
  const [installModalOpen, setInstallModalOpen] = useState(false);

  // Global loading indicator
  const [isLoading, setIsLoading] = useState(false);

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('transcripta_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('transcripta_theme', 'light');
    }
  }, [darkMode]);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          let profile = await getUserProfile(firebaseUser.uid);
          if (!profile) {
            profile = await createOrUpdateUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
            });
          }
          setUserProfile(profile);

          // Fetch cloud projects from Firestore
          const cloudProjects = await fetchUserProjectsFromFirestore();
          if (cloudProjects.length > 0) {
            setProjects(cloudProjects);
          } else {
            // Fallback to local storage if user has local drafts
            const local = getStoredTranscripts();
            setProjects(local);
          }
        } catch (err) {
          console.warn('Error loading user profile or projects:', err);
          const local = getStoredTranscripts();
          setProjects(local);
        }
      } else {
        setUserProfile(null);
        // Load local storage transcripts
        const local = getStoredTranscripts();
        setProjects(local);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Handle successful transcription
  const handleTranscriptionSuccess = async (newRecord: TranscriptRecord) => {
    setCurrentRecord(newRecord);

    // Save to local storage
    const updatedLocal = saveTranscriptToHistory(newRecord);
    setProjects(updatedLocal);

    // If authenticated, sync with Cloud Firestore
    if (auth.currentUser) {
      await saveProjectToFirestore(newRecord);
      // Deduct used minutes
      const durationSeconds = newRecord.durationSeconds || 60;
      const durationMinutes = Number((durationSeconds / 60).toFixed(1));
      await incrementUserUsage(auth.currentUser.uid, durationMinutes);

      // Refresh profile
      const refreshedProfile = await getUserProfile(auth.currentUser.uid);
      if (refreshedProfile) setUserProfile(refreshedProfile);
    }

    // Direct to the workspace editor
    setCurrentPage('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update record handler (inline edits, translation, note generation)
  const handleUpdateRecord = async (updated: TranscriptRecord) => {
    setCurrentRecord(updated);

    // Update in local storage
    const updatedList = updateTranscriptInHistory(updated.id, updated);
    setProjects(updatedList);

    // If authenticated, update in Firestore
    if (auth.currentUser) {
      await saveProjectToFirestore(updated);
    }
  };

  // Delete project handler
  const handleDeleteProject = async (id: string) => {
    // Update local storage
    const updatedList = deleteTranscriptFromHistory(id);
    setProjects(updatedList);

    if (currentRecord?.id === id) {
      setCurrentRecord(null);
      if (currentPage === 'workspace' || currentPage === 'subtitles' || currentPage === 'summary') {
        setCurrentPage('dashboard');
      }
    }

    // If authenticated, delete from Firestore
    if (auth.currentUser) {
      await deleteProjectFromFirestore(id);
    }
  };

  // Rename project handler
  const handleRenameProject = async (id: string, newTitle: string) => {
    const updatedList = updateTranscriptInHistory(id, { title: newTitle });
    setProjects(updatedList);

    if (currentRecord?.id === id) {
      setCurrentRecord({ ...currentRecord, title: newTitle });
    }

    if (auth.currentUser) {
      const target = updatedList.find((p) => p.id === id);
      if (target) await saveProjectToFirestore(target);
    }
  };

  // Select project from dashboard or history
  const handleOpenProject = (record: TranscriptRecord) => {
    setCurrentRecord(record);
    setCurrentPage('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Plan upgrade / change handler
  const handleSelectPlan = async (newPlan: SubscriptionPlan) => {
    if (!userProfile) {
      setAuthModalMode('signup');
      setAuthModalOpen(true);
      return;
    }

    const limits: Record<SubscriptionPlan, number> = {
      free: 60,
      pro: 300,
      business: 1200,
    };

    try {
      const updated = await createOrUpdateUserProfile({
        uid: userProfile.uid,
        email: userProfile.email,
        plan: newPlan,
        transcriptionMinutesLimit: limits[newPlan],
      });
      setUserProfile(updated);
    } catch (err) {
      console.error('Plan upgrade error:', err);
    }
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleOpenLegal = (tab: 'privacy' | 'terms' | 'contact') => {
    setLegalModalTab(tab);
    setLegalModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      {/* Universal Top Navbar */}
      <Navbar
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={projects.length}
        userProfile={userProfile}
        currentPage={currentPage}
        onNavigate={(p) => {
          setCurrentPage(p);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAuth={handleOpenAuth}
        onOpenProfile={() => setProfileModalOpen(true)}
        onNewTranscription={() => {
          setCurrentPage('upload');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Dynamic View Area */}
      <main className="flex-1">
        {/* 1. TRANSCRIPTION WORKSPACE */}
        {currentPage === 'workspace' && currentRecord && (
          <div className="py-6 sm:py-10">
            <TranscriptionWorkspace
              record={currentRecord}
              onUpdateRecord={handleUpdateRecord}
              onNavigateSubtitles={() => setCurrentPage('subtitles')}
              onNavigateSummaries={() => setCurrentPage('summary')}
              onNavigateTranslate={() => setCurrentPage('summary')}
              onBack={() => setCurrentPage('dashboard')}
            />
          </div>
        )}

        {/* 2. SUBTITLE EDITOR */}
        {currentPage === 'subtitles' && currentRecord && (
          <div className="py-6 sm:py-10">
            <SubtitleEditor
              record={currentRecord}
              onUpdateRecord={handleUpdateRecord}
              onBack={() => setCurrentPage('workspace')}
            />
          </div>
        )}

        {/* 3. TRANSLATION & SUMMARIZATION WORKSPACE */}
        {currentPage === 'summary' && currentRecord && (
          <div className="py-6 sm:py-10">
            <SummarizationWorkspace
              record={currentRecord}
              onUpdateRecord={handleUpdateRecord}
              onBack={() => setCurrentPage('workspace')}
            />
          </div>
        )}

        {/* 4. MAIN DASHBOARD */}
        {currentPage === 'dashboard' && (
          <DashboardPage
            userProfile={userProfile}
            projects={projects}
            onOpenProject={handleOpenProject}
            onNewUpload={() => setCurrentPage('upload')}
            onDeleteProject={handleDeleteProject}
            onRenameProject={handleRenameProject}
            onUpgradeClick={() => setCurrentPage('pricing')}
          />
        )}

        {/* 5. DEDICATED UPLOAD / TRANSCRIBE PAGE */}
        {currentPage === 'upload' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                New Transcription Project
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Upload audio/video files, paste YouTube links, or record live voice memos with automatic speaker detection.
              </p>
            </div>

            <TranscriptionCard
              onTranscriptionSuccess={handleTranscriptionSuccess}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />

            <div className="text-center pt-2">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                &larr; Back to My Dashboard
              </button>
            </div>
          </div>
        )}

        {/* 6. SUBSCRIPTION & USAGE PAGE */}
        {currentPage === 'pricing' && (
          <SubscriptionUsagePage
            userProfile={userProfile}
            onSelectPlan={handleSelectPlan}
            onBack={() => setCurrentPage(projects.length > 0 ? 'dashboard' : 'landing')}
          />
        )}

        {/* 7. HOMEPAGE & LANDING VIEW */}
        {currentPage === 'landing' && (
          <div className="space-y-12 sm:space-y-20 pb-16">
            {/* HERO SECTION */}
            <section className="pt-12 sm:pt-20 pb-6 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-100/80 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-cyan-800 dark:text-cyan-300 text-xs font-semibold mb-6 shadow-xs">
                <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Next-Gen Audio Intelligence Powered by Gemini Flash</span>
              </div>

              {/* Tagline Headline */}
              <h1
                className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.08]"
                style={{ textWrap: 'balance' }}
              >
                Turn Every Video <span className="text-cyan-500 underline decoration-cyan-400/40 decoration-wavy decoration-2">Into Words.</span>
              </h1>

              <p
                className="mt-5 text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed"
                style={{ textWrap: 'balance' }}
              >
                Accurate speech-to-text, synchronized subtitle editor, multi-language translation, and executive notes in seconds.
              </p>

              {/* Feature Badges */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs font-medium text-slate-700 dark:text-slate-200">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ultra-Fast Processing</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <Globe2 className="w-3.5 h-3.5 text-cyan-500" />
                  <span>30+ Global Languages</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <Users className="w-3.5 h-3.5 text-teal-500" />
                  <span>Speaker Diarization</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Enterprise Privacy</span>
                </div>
                <button
                  onClick={() => setInstallModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50/80 dark:bg-cyan-950/60 border border-cyan-400/50 dark:border-cyan-800/80 text-cyan-800 dark:text-cyan-300 shadow-xs hover:border-cyan-500 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Download for Android, iPhone, Windows &amp; Mac</span>
                </button>
              </div>

              {/* Hero Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    const card = document.getElementById('transcribe');
                    card?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-8 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm shadow-md shadow-cyan-600/30 hover:shadow-cyan-600/50 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
                >
                  <span>Transcribe for Free</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="px-6 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all flex items-center gap-2 shadow-xs"
                >
                  <LayoutDashboard className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Open Dashboard</span>
                </button>

                <button
                  onClick={() => setInstallModalOpen(true)}
                  className="px-5 py-3.5 rounded-xl border border-cyan-500/40 bg-cyan-50/50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 font-semibold text-sm transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Download App</span>
                </button>
              </div>
            </section>

            {/* MAIN TRANSCRIPTION CARD */}
            <section id="transcribe" className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto scroll-mt-20">
              <TranscriptionCard
                onTranscriptionSuccess={handleTranscriptionSuccess}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            </section>

            {/* VISUAL DEMONSTRATION OF WORKSPACE & SUBTITLE EDITOR */}
            <InteractiveEditorDemo />

            {/* 3-STEP HOW IT WORKS */}
            <HowItWorks />

            {/* FEATURE HIGHLIGHTS */}
            <FeatureHighlights />

            {/* PRICING SECTION */}
            <PricingSection
              userProfile={userProfile}
              onSelectPlan={handleSelectPlan}
              onOpenAuth={handleOpenAuth}
            />

            {/* FAQ SECTION */}
            <FaqSection />
          </div>
        )}
      </main>

      {/* Universal Footer */}
      <Footer
        onNavigate={(p) => setCurrentPage(p)}
        onOpenLegal={handleOpenLegal}
        onOpenInstall={() => setInstallModalOpen(true)}
      />

      {/* History Slide-over Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={projects}
        onSelectRecord={(r) => {
          setIsHistoryOpen(false);
          handleOpenProject(r);
        }}
        onUpdateRecord={(id, updates) => {
          const updated = updateTranscriptInHistory(id, updates);
          setProjects(updated);
        }}
        onDeleteRecord={(id) => handleDeleteProject(id)}
        onClearAll={() => {
          clearAllHistory();
          setProjects([]);
        }}
      />

      {/* Firebase Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={() => {
          setAuthModalOpen(false);
          setCurrentPage('dashboard');
        }}
      />

      {/* User Profile & API Credentials Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        userProfile={userProfile}
        onProfileUpdated={(updated) => setUserProfile(updated)}
        onNavigatePricing={() => {
          setProfileModalOpen(false);
          setCurrentPage('pricing');
        }}
      />

      {/* Privacy, Terms & Contact Modal */}
      <LegalContactModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />

      {/* Offline Connectivity Toast Indicator */}
      <OfflineIndicator />

      {/* Cross-Platform Download & Install Modal */}
      <InstallAppModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />
    </div>
  );
}
