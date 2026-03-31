import { createWorker } from 'tesseract.js';
import { HebrewLine, HebrewWord } from './types';
import { transliterateHebrew, isHebrew } from './transliterate';
import { translateWord } from './dictionary';

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
    // Enable blocks output to get word-level bounding boxes
    const { data } = await worker.recognize(imageSource, {}, { blocks: true, text: true });

    const lines: HebrewLine[] = [];
    let lineIndex = 0;

    // Tesseract v7: data.blocks -> paragraphs -> lines -> words
    if (data.blocks && data.blocks.length > 0) {
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
                translation: isHebrew(text) ? translateWord(text) : null,
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

    // Fallback: if blocks didn't work but we have plain text, parse it manually
    if (lines.length === 0 && data.text && data.text.trim().length > 0) {
      const dims = await getImageDimensions(imageSource);
      const textLines = data.text.split('\n').filter((l: string) => l.trim().length > 0);
      const lineHeight = dims.height / Math.max(textLines.length, 1);

      textLines.forEach((lineText: string, li: number) => {
        const wordTexts = lineText.trim().split(/\s+/).filter((w: string) => w.length > 0);
        const wordWidth = dims.width / Math.max(wordTexts.length, 1);
        const words: HebrewWord[] = wordTexts.map((text: string, wi: number) => ({
          hebrew: text,
          transliteration: isHebrew(text) ? transliterateHebrew(text) : text,
          translation: isHebrew(text) ? translateWord(text) : null,
          index: wi,
          bbox: {
            x0: dims.width - (wi + 1) * wordWidth, // RTL approximation
            y0: li * lineHeight,
            x1: dims.width - wi * wordWidth,
            y1: (li + 1) * lineHeight,
          },
          confidence: 50,
        }));

        if (words.length > 0) {
          lines.push({
            words,
            fullText: lineText.trim(),
            lineIndex: li,
            bbox: {
              x0: 0,
              y0: li * lineHeight,
              x1: dims.width,
              y1: (li + 1) * lineHeight,
            },
          });
        }
      });
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
