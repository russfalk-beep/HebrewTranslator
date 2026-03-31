export interface HebrewWord {
  hebrew: string;
  transliteration: string;
  index: number;
}

export interface HebrewLine {
  words: HebrewWord[];
  fullText: string;
  lineIndex: number;
}

export interface SavedPage {
  id: string;
  name: string;
  imageDataUrl: string;
  lines: HebrewLine[];
  currentLineIndex: number;
  currentWordIndex: number;
  createdAt: number;
  updatedAt: number;
}
