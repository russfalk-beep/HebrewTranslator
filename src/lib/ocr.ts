import { createWorker } from 'tesseract.js';
import { HebrewLine, HebrewWord } from './types';
import { transliterateHebrew, isHebrew } from './transliterate';

export async function processImage(
  imageSource: File | string,
  onProgress?: (progress: number) => void
): Promise<HebrewLine[]> {
  const worker = await createWorker('heb', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const { data } = await worker.recognize(imageSource);

    // Parse the recognized text into lines and words
    const lines: HebrewLine[] = [];
    const textLines = data.text.split('\n').filter(line => line.trim().length > 0);

    textLines.forEach((lineText, lineIndex) => {
      const wordTexts = lineText.trim().split(/\s+/).filter(w => w.length > 0);
      const words: HebrewWord[] = wordTexts
        .filter(w => isHebrew(w) || w.length > 0)
        .map((hebrew, wordIndex) => ({
          hebrew,
          transliteration: isHebrew(hebrew) ? transliterateHebrew(hebrew) : hebrew,
          index: wordIndex,
        }));

      if (words.length > 0) {
        lines.push({
          words,
          fullText: lineText.trim(),
          lineIndex,
        });
      }
    });

    return lines;
  } finally {
    await worker.terminate();
  }
}
