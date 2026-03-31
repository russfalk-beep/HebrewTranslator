import { createWorker } from 'tesseract.js';
import { HebrewLine, HebrewWord } from './types';
import { transliterateHebrew, isHebrew, cleanHebrewText } from './transliterate';
import { translateWord, loadDictionary } from './dictionary';

export interface OcrResult {
  lines: HebrewLine[];
  imageWidth: number;
  imageHeight: number;
}

// Smart filter: keep only the actual body text, remove illustration/edge/decoration noise
function filterNoiseLines(lines: HebrewLine[], imgWidth: number, imgHeight: number): void {
  if (lines.length < 2) return;

  // Step 1: Remove words near image edges (likely bleed-through from other pages)
  const edgeMarginX = imgWidth * 0.04;  // 4% from left/right edges
  const edgeMarginY = imgHeight * 0.03; // 3% from top/bottom edges

  for (const line of lines) {
    line.words = line.words.filter(w => {
      const midX = (w.bbox.x0 + w.bbox.x1) / 2;
      const midY = (w.bbox.y0 + w.bbox.y1) / 2;
      return midX > edgeMarginX && midX < imgWidth - edgeMarginX &&
             midY > edgeMarginY && midY < imgHeight - edgeMarginY;
    });
  }

  // Remove empty lines
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].words.length === 0) lines.splice(i, 1);
  }

  if (lines.length < 2) return;

  // Step 2: Calculate median word height (= the body text size)
  const allHeights: number[] = [];
  for (const line of lines) {
    for (const word of line.words) {
      const h = word.bbox.y1 - word.bbox.y0;
      if (h > 0) allHeights.push(h);
    }
  }
  if (allHeights.length === 0) return;

  allHeights.sort((a, b) => a - b);
  const medianHeight = allHeights[Math.floor(allHeights.length / 2)];

  // Step 3: Find the most common X range (body text is usually aligned)
  // Body text lines tend to share similar right-edge X positions (RTL text)
  const lineRightEdges = lines.map(l => {
    const maxX = Math.max(...l.words.map(w => w.bbox.x1));
    return maxX;
  });
  lineRightEdges.sort((a, b) => a - b);
  const medianRightEdge = lineRightEdges[Math.floor(lineRightEdges.length / 2)];

  // Step 4: Remove lines that don't match body text characteristics
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const avgHeight = line.words.reduce((sum, w) => sum + (w.bbox.y1 - w.bbox.y0), 0) / line.words.length;
    const lineRight = Math.max(...line.words.map(w => w.bbox.x1));

    // Text much smaller than body text = illustration label
    const isTooSmall = avgHeight < medianHeight * 0.5;

    // Text much larger than body text = header/title
    const isTooLarge = avgHeight > medianHeight * 2.0;

    // Single short word = likely noise
    const isSingleJunk = line.words.length === 1 && line.words[0].hebrew.length <= 3;

    // Line is far from the typical text alignment = illustration text
    const rightEdgeDiff = Math.abs(lineRight - medianRightEdge);
    const isMisaligned = rightEdgeDiff > imgWidth * 0.35 && line.words.length <= 2;

    if (isTooSmall || isTooLarge || isSingleJunk || isMisaligned) {
      lines.splice(i, 1);
    }
  }

  // Re-index lines
  lines.forEach((line, idx) => {
    line.lineIndex = idx;
    line.words.forEach((word, widx) => { word.index = widx; });
  });
}

// Filter out OCR noise: verse numbers, single punctuation, non-Hebrew junk
function shouldSkipWord(text: string, confidence: number): boolean {
  // Skip if confidence is very low
  if (confidence < 20) return true;

  // Skip pure numbers (verse numbers like 1, 2, 3)
  if (/^\d+$/.test(text)) return true;

  // Skip single characters that aren't Hebrew letters
  if (text.length === 1 && !isHebrew(text)) return true;

  // Skip punctuation-only strings
  if (/^[^\u05D0-\u05EA\w]+$/.test(text)) return true;

  // Skip very short non-Hebrew strings (like ":", ".", ",")
  if (text.length <= 2 && !isHebrew(text)) return true;

  // Skip common OCR artifacts
  if (/^[|\\\/\[\]{}()]+$/.test(text)) return true;

  return false;
}

export async function processImage(
  imageSource: File | string,
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  // Load dictionary in background — don't let it block or crash OCR
  loadDictionary().catch(() => {});

  let worker;
  try {
    worker = await createWorker('heb', undefined, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });
  } catch (err) {
    console.error('Failed to create Tesseract worker:', err);
    throw new Error('Could not start text recognition. Please refresh and try again.');
  }

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
              const rawText = word.text.trim();
              if (!rawText) continue;

              // Clean up Hebrew punctuation (geresh, gershayim, quotes)
              const text = cleanHebrewText(rawText);
              if (!text) continue;

              // Skip junk: verse numbers, single chars, punctuation-only, low confidence
              if (shouldSkipWord(text, word.confidence)) continue;

              // Split maqaf-joined words (like תמימי-דרך → two words)
              const subWords = text.includes(' ') ? text.split(' ') : [text];
              const subWidth = (word.bbox.x1 - word.bbox.x0) / subWords.length;

              for (let sw = 0; sw < subWords.length; sw++) {
                const subText = subWords[sw].trim();
                if (!subText) continue;

                words.push({
                  hebrew: subText,
                  transliteration: isHebrew(subText) ? transliterateHebrew(subText) : subText,
                  translation: isHebrew(subText) ? translateWord(subText) : null,
                  index: wordIndex,
                  bbox: {
                    // Approximate sub-word bounding box (RTL: rightmost first)
                    x0: word.bbox.x0 + (subWords.length - 1 - sw) * subWidth,
                    y0: word.bbox.y0,
                    x1: word.bbox.x0 + (subWords.length - sw) * subWidth,
                    y1: word.bbox.y1,
                  },
                  confidence: word.confidence,
                });
                wordIndex++;
              }
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

    // Post-process: filter out illustration/decoration text by size consistency
    const dims = await getImageDimensions(imageSource);
    filterNoiseLines(lines, dims.width, dims.height);

    // Fallback: if blocks didn't work but we have plain text, parse it manually
    if (lines.length === 0 && data.text && data.text.trim().length > 0) {
      const textLines = data.text.split('\n').filter((l: string) => l.trim().length > 0);
      const lineHeight = dims.height / Math.max(textLines.length, 1);

      textLines.forEach((lineText: string, li: number) => {
        const wordTexts = lineText.trim().split(/\s+/)
          .map((w: string) => cleanHebrewText(w))
          .filter((w: string) => w.length > 0 && !shouldSkipWord(w, 50));
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

    return { lines, imageWidth: dims.width, imageHeight: dims.height };
  } finally {
    try { await worker.terminate(); } catch { /* ok */ }
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
