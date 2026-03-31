'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { HebrewLine, HebrewWord } from '@/lib/types';
import { speakHebrew, stopSpeaking, initVoices } from '@/lib/speech';
import ReadAlongControls from './ReadAlongControls';

interface ImageOverlayProps {
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  lines: HebrewLine[];
  initialLineIndex: number;
  initialWordIndex: number;
  onProgressChange: (lineIndex: number, wordIndex: number) => void;
}

export default function ImageOverlay({
  imageDataUrl,
  imageWidth,
  imageHeight,
  lines,
  initialLineIndex,
  initialWordIndex,
  onProgressChange,
}: ImageOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayWidth, setDisplayWidth] = useState(0);
  const [currentLine, setCurrentLine] = useState(initialLineIndex);
  const [currentWord, setCurrentWord] = useState(initialWordIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.8);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    initVoices();
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setDisplayWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const scale = displayWidth > 0 ? displayWidth / imageWidth : 0;

  const saveProgress = useCallback((line: number, word: number) => {
    onProgressChange(line, word);
  }, [onProgressChange]);

  // Flatten all words for sequential navigation
  const allWords: { lineIdx: number; wordIdx: number; word: HebrewWord }[] = [];
  lines.forEach((line, li) => {
    line.words.forEach((word, wi) => {
      allWords.push({ lineIdx: li, wordIdx: wi, word });
    });
  });

  const currentFlatIndex = allWords.findIndex(
    w => w.lineIdx === currentLine && w.wordIdx === currentWord
  );

  const moveToNext = useCallback(() => {
    const nextIdx = currentFlatIndex + 1;
    if (nextIdx < allWords.length) {
      const next = allWords[nextIdx];
      setCurrentLine(next.lineIdx);
      setCurrentWord(next.wordIdx);
      saveProgress(next.lineIdx, next.wordIdx);
    } else {
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }, [currentFlatIndex, allWords, saveProgress]);

  const moveToPrev = useCallback(() => {
    const prevIdx = currentFlatIndex - 1;
    if (prevIdx >= 0) {
      const prev = allWords[prevIdx];
      setCurrentLine(prev.lineIdx);
      setCurrentWord(prev.wordIdx);
      saveProgress(prev.lineIdx, prev.wordIdx);
    }
  }, [currentFlatIndex, allWords, saveProgress]);

  const handleWordClick = (lineIdx: number, wordIdx: number, word: HebrewWord) => {
    setCurrentLine(lineIdx);
    setCurrentWord(wordIdx);
    saveProgress(lineIdx, wordIdx);
    speakHebrew(word.hebrew, speed);
  };

  const playReadAlong = useCallback(async () => {
    isPlayingRef.current = true;
    setIsPlaying(true);

    let flatIdx = currentFlatIndex;

    while (isPlayingRef.current && flatIdx < allWords.length) {
      const { lineIdx, wordIdx, word } = allWords[flatIdx];
      setCurrentLine(lineIdx);
      setCurrentWord(wordIdx);
      saveProgress(lineIdx, wordIdx);

      try {
        await speakHebrew(word.hebrew, speed);
      } catch {
        // Speech may fail
      }

      if (!isPlayingRef.current) break;

      const nextWord = allWords[flatIdx + 1];
      const isNewLine = nextWord && nextWord.lineIdx !== lineIdx;
      await new Promise(resolve => setTimeout(resolve, isNewLine ? 600 : 300));
      flatIdx++;
    }

    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [currentFlatIndex, allWords, speed, saveProgress]);

  const handlePause = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    stopSpeaking();
  };

  const handleStop = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    stopSpeaking();
    setCurrentLine(0);
    setCurrentWord(0);
    saveProgress(0, 0);
  };

  const currentWordData = lines[currentLine]?.words[currentWord];

  // Auto-scroll to keep active word visible
  useEffect(() => {
    if (!currentWordData || !containerRef.current) return;
    const wordTop = currentWordData.bbox.y0 * scale;
    const containerTop = containerRef.current.getBoundingClientRect().top + window.scrollY;
    const targetScroll = containerTop + wordTop - window.innerHeight / 3;
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, [currentLine, currentWord, currentWordData, scale]);

  return (
    <div className="flex flex-col gap-3 pb-32">
      {/* Image with overlays */}
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden border-2 border-gray-200 shadow-md"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageDataUrl}
          alt="Hebrew page"
          className="w-full block"
          draggable={false}
        />

        {/* Word overlays on the image */}
        {scale > 0 && lines.map((line) =>
          line.words.map((word) => {
            const isActive = line.lineIndex === currentLine && word.index === currentWord;
            const isCompleted =
              line.lineIndex < currentLine ||
              (line.lineIndex === currentLine && word.index < currentWord);

            const left = word.bbox.x0 * scale;
            const top = word.bbox.y0 * scale;
            const width = (word.bbox.x1 - word.bbox.x0) * scale;
            const height = (word.bbox.y1 - word.bbox.y0) * scale;

            return (
              <div key={`${line.lineIndex}-${word.index}`}>
                {/* Clickable highlight over the word */}
                <button
                  onClick={() => handleWordClick(line.lineIndex, word.index, word)}
                  className={`absolute transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'z-10'
                      : ''
                  }`}
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    // Active word: yellow highlight + underline
                    backgroundColor: isActive
                      ? 'rgba(250, 204, 21, 0.4)'
                      : isCompleted
                        ? 'rgba(134, 239, 172, 0.25)'
                        : 'transparent',
                    borderBottom: isActive
                      ? '3px solid #f59e0b'
                      : isCompleted
                        ? '2px solid rgba(34, 197, 94, 0.5)'
                        : '2px solid transparent',
                    borderRadius: '2px',
                  }}
                  title={word.transliteration}
                />

                {/* Transliteration right below each word on the page */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${left}px`,
                    top: `${top + height + 2}px`,
                    width: `${width}px`,
                    textAlign: 'center',
                    zIndex: isActive ? 10 : 1,
                  }}
                >
                  <span
                    className="inline-block leading-none"
                    style={{
                      fontSize: `${Math.max(7, Math.min(13, height * 0.38))}px`,
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? '#b45309' : isCompleted ? '#15803d' : '#1e40af',
                      backgroundColor: isActive
                        ? 'rgba(254, 243, 199, 0.95)'
                        : 'rgba(255, 255, 255, 0.85)',
                      padding: '0px 2px',
                      borderRadius: '2px',
                    }}
                  >
                    {word.transliteration}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${allWords.length > 0 ? ((currentFlatIndex + 1) / allWords.length) * 100 : 0}%`
            }}
          />
        </div>
        <span>{currentFlatIndex + 1}/{allWords.length}</span>
      </div>

      {/* Read Along Controls */}
      <ReadAlongControls
        isPlaying={isPlaying}
        speed={speed}
        onPlay={playReadAlong}
        onPause={handlePause}
        onStop={handleStop}
        onNext={moveToNext}
        onPrev={moveToPrev}
        onSpeedChange={setSpeed}
      />
    </div>
  );
}
