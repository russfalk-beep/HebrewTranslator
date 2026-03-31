export interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface HebrewWord {
  hebrew: string;
  transliteration: string;
  index: number;
  bbox: BBox;
  confidence: number;
}

export interface HebrewLine {
  words: HebrewWord[];
  fullText: string;
  lineIndex: number;
  bbox: BBox;
}

export interface SavedPage {
  id: string;
  name: string;
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  lines: HebrewLine[];
  currentLineIndex: number;
  currentWordIndex: number;
  createdAt: number;
  updatedAt: number;
}
