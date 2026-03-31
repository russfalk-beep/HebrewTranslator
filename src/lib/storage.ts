import { SavedPage } from './types';

const STORAGE_KEY = 'hebrew-tutor-pages';

export function getSavedPages(): SavedPage[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function savePage(page: SavedPage): void {
  const pages = getSavedPages();
  const existingIndex = pages.findIndex(p => p.id === page.id);
  if (existingIndex >= 0) {
    pages[existingIndex] = { ...page, updatedAt: Date.now() };
  } else {
    pages.push(page);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
}

export function getPage(id: string): SavedPage | null {
  const pages = getSavedPages();
  return pages.find(p => p.id === id) || null;
}

export function deletePage(id: string): void {
  const pages = getSavedPages().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
}

export function updateProgress(id: string, lineIndex: number, wordIndex: number): void {
  const page = getPage(id);
  if (page) {
    page.currentLineIndex = lineIndex;
    page.currentWordIndex = wordIndex;
    savePage(page);
  }
}
