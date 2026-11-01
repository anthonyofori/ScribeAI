export interface TranscriptSegment {
  id: string;
  start: string;
  end: string;
  startMs?: number;
  endMs?: number;
  speaker: string;
  text: string;
  order?: number;
}

export type NoteMode =
  | 'none'
  | 'smart_summary'
  | 'short_summary'
  | 'detailed_summary'
  | 'main_ideas'
  | 'key_points'
  | 'takeaways'
  | 'quotes'
  | 'action_items'
  | 'chapters'
  | 'study_notes'
  | 'minutes'
  | 'qa';

export type SummaryDetailLevel = 'concise' | 'balanced' | 'detailed';

export type JobStatus = 'uploaded' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type SubscriptionPlan = 'free' | 'pro' | 'business';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  plan: SubscriptionPlan;
  transcriptionMinutesUsed: number;
  transcriptionMinutesLimit: number;
  defaultLanguage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptionJob {
  id: string;
  projectId: string;
  ownerId: string;
  status: JobStatus;
  stage: string;
  progress: number;
  attempts: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptRecord {
  id: string;
  ownerId?: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  duration: string;
  durationSeconds?: number;
  language: string;
  segments: TranscriptSegment[];
  fullText: string;
  notes: string;
  noteMode: NoteMode;
  sourceType: 'upload' | 'youtube' | 'record';
  fileName?: string;
  fileSize?: number;
  fileFormat?: string;
  mediaUrl?: string;
  audioUrl?: string;
  youtubeUrl?: string;
  status?: JobStatus;
  progressStage?: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName?: string;
}

export type AppPage =
  | 'landing'
  | 'dashboard'
  | 'upload'
  | 'workspace'
  | 'subtitles'
  | 'summary'
  | 'history'
  | 'profile'
  | 'pricing'
  | 'privacy'
  | 'terms'
  | 'contact'
  | 'auth';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'auto', name: 'Auto Detect (Recommended)' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'tw', name: 'Twi (Akan)', nativeName: 'Twi' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'zh', name: 'Chinese (Mandarin)', nativeName: '中文' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Èdè Yorùbá' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'tl', name: 'Tagalog (Filipino)', nativeName: 'Tagalog' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
];
