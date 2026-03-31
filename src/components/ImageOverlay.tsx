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
      {/* Current word info bar */}
      {currentWordData && (
        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex items-center gap-4 sticky top-0 z-20">
          <div className="text-2xl font-bold flex-shrink-0" dir="rtl">{currentWordData.hebrew}</div>
          <div className="flex-1 min-w-0">
            <div className="text-blue-700 font-semibold text-sm">{currentWordData.transliteration}</div>
            {currentWordData.translation && (
              <div className="text-gray-500 text-xs italic">{currentWordData.translation}</div>
            )}
          </div>
          <button
            onClick={() => speakHebrew(currentWordData.hebrew, speed)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full flex-shrink-0 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          </button>
        </div>
      )}

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

                {/* Transliteration + translation below each word */}
                <div
                  className="absolute pointer-events-none flex flex-col items-center"
                  style={{
                    left: `${left}px`,
                    top: `${top + height + 1}px`,
                    width: `${Math.max(width, 30)}px`,
                    textAlign: 'center',
                    zIndex: isActive ? 10 : 1,
                  }}
                >
                  {/* Transliteration (phonetic) */}
                  <span
                    className="inline-block leading-none"
                    style={{
                      fontSize: `${Math.max(7, Math.min(13, height * 0.35))}px`,
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
                  {/* English translation */}
                  {word.translation && (
                    <span
                      className="inline-block leading-none mt-px"
                      style={{
                        fontSize: `${Math.max(6, Math.min(10, height * 0.28))}px`,
                        fontWeight: 500,
                        fontStyle: 'italic',
                        color: isActive ? '#7c2d12' : '#6b7280',
                        backgroundColor: isActive
                          ? 'rgba(254, 243, 199, 0.9)'
                          : 'rgba(255, 255, 255, 0.8)',
                        padding: '0px 2px',
                        borderRadius: '2px',
                      }}
                    >
                      {word.translation}
                    </span>
                  )}
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
