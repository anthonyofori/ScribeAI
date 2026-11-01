import { TranscriptRecord } from '../types';

const STORAGE_KEY = 'scribeai_history_v1';

export function getStoredTranscripts(): TranscriptRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load history from localStorage:', err);
    return [];
  }
}

export function saveTranscriptToHistory(record: TranscriptRecord): TranscriptRecord[] {
  try {
    const current = getStoredTranscripts();
    // Prepend new record, ensure unique by ID
    const updated = [record, ...current.filter((item) => item.id !== record.id)];
    // Cap at 50 items to keep storage neat
    const trimmed = updated.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
    return [];
  }
}

export function updateTranscriptInHistory(id: string, updates: Partial<TranscriptRecord>): TranscriptRecord[] {
  try {
    const current = getStoredTranscripts();
    const updated = current.map((item) => (item.id === id ? { ...item, ...updates } : item));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to update in localStorage:', err);
    return [];
  }
}

export function deleteTranscriptFromHistory(id: string): TranscriptRecord[] {
  try {
    const current = getStoredTranscripts();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete from localStorage:', err);
    return [];
  }
}

export function clearAllHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear history:', err);
  }
}
