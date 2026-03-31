import { createWorker } from 'tesseract.js';
import { HebrewLine, HebrewWord } from './types';
import { transliterateHebrew, isHebrew } from './transliterate';

export interface OcrResult {
  lines: HebrewLine[];
  imageWidth: number;
  imageHeight: number;
}

export async function processImage(
  imageSource: File | string,
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  const worker = await createWorker('heb', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const { data } = await worker.recognize(imageSource);

    const lines: HebrewLine[] = [];
    let lineIndex = 0;

    // Tesseract v7: data.blocks -> paragraphs -> lines -> words
    if (data.blocks) {
      for (const block of data.blocks) {
        if (!block.paragraphs) continue;
        for (const paragraph of block.paragraphs) {
          if (!paragraph.lines) continue;
          for (const line of paragraph.lines) {
            if (!line.text.trim()) continue;

            const words: HebrewWord[] = [];
            let wordIndex = 0;

            for (const word of line.words) {
              const text = word.text.trim();
              if (!text) continue;

              words.push({
                hebrew: text,
                transliteration: isHebrew(text) ? transliterateHebrew(text) : text,
                index: wordIndex,
                bbox: {
                  x0: word.bbox.x0,
                  y0: word.bbox.y0,
                  x1: word.bbox.x1,
                  y1: word.bbox.y1,
                },
                confidence: word.confidence,
              });
              wordIndex++;
            }

            if (words.length > 0) {
              lines.push({
                words,
                fullText: line.text.trim(),
                lineIndex,
                bbox: {
                  x0: line.bbox.x0,
                  y0: line.bbox.y0,
                  x1: line.bbox.x1,
                  y1: line.bbox.y1,
                },
              });
              lineIndex++;
            }
          }
        }
      }
    }

    const dims = await getImageDimensions(imageSource);
    return { lines, imageWidth: dims.width, imageHeight: dims.height };
  } finally {
    await worker.terminate();
  }
}

function getImageDimensions(src: File | string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 1, height: 1 });
    if (typeof src === 'string') {
      img.src = src;
    } else {
      img.src = URL.createObjectURL(src);
    }
  });
}
