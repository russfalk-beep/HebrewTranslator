'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { HebrewLine } from '@/lib/types';
import { speakHebrew, stopSpeaking, initVoices } from '@/lib/speech';
import LineDisplay from './LineDisplay';
import ReadAlongControls from './ReadAlongControls';

interface PageViewerProps {
  lines: HebrewLine[];
  initialLineIndex: number;
  initialWordIndex: number;
  onProgressChange: (lineIndex: number, wordIndex: number) => void;
}

export default function PageViewer({
  lines,
  initialLineIndex,
  initialWordIndex,
  onProgressChange,
}: PageViewerProps) {
  const [currentLine, setCurrentLine] = useState(initialLineIndex);
  const [currentWord, setCurrentWord] = useState(initialWordIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.8);
  const [showImage, setShowImage] = useState(false);
  const isPlayingRef = useRef(false);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initVoices();
  }, []);

  // Auto-scroll to active line
  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentLine]);

  const saveProgress = useCallback((line: number, word: number) => {
    onProgressChange(line, word);
  }, [onProgressChange]);

  const moveToNext = useCallback(() => {
    setCurrentWord(prev => {
      const line = lines[currentLine];
      if (prev + 1 < line.words.length) {
        const next = prev + 1;
        saveProgress(currentLine, next);
        return next;
      } else {
        // Move to next line
        if (currentLine + 1 < lines.length) {
          setCurrentLine(cl => {
            const nextLine = cl + 1;
            saveProgress(nextLine, 0);
            return nextLine;
          });
          return 0;
        }
        // End of page
        setIsPlaying(false);
        isPlayingRef.current = false;
        return prev;
      }
    });
  }, [currentLine, lines, saveProgress]);

  const moveToPrev = useCallback(() => {
    setCurrentWord(prev => {
      if (prev > 0) {
        const next = prev - 1;
        saveProgress(currentLine, next);
        return next;
      } else if (currentLine > 0) {
        const prevLine = currentLine - 1;
        const lastWord = lines[prevLine].words.length - 1;
        setCurrentLine(prevLine);
        saveProgress(prevLine, lastWord);
        return lastWord;
      }
      return prev;
    });
  }, [currentLine, lines, saveProgress]);

  const playReadAlong = useCallback(async () => {
    isPlayingRef.current = true;
    setIsPlaying(true);

    let lineIdx = currentLine;
    let wordIdx = currentWord;

    while (isPlayingRef.current && lineIdx < lines.length) {
      const line = lines[lineIdx];
      while (isPlayingRef.current && wordIdx < line.words.length) {
        setCurrentLine(lineIdx);
        setCurrentWord(wordIdx);
        saveProgress(lineIdx, wordIdx);

        try {
          await speakHebrew(line.words[wordIdx].hebrew, speed);
        } catch {
          // Speech may fail on some devices
        }

        if (!isPlayingRef.current) break;

        // Brief pause between words
        await new Promise(resolve => setTimeout(resolve, 300));
        wordIdx++;
      }
      if (!isPlayingRef.current) break;
      wordIdx = 0;
      lineIdx++;

      // Pause between lines
      if (lineIdx < lines.length) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }

    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [currentLine, currentWord, lines, speed, saveProgress]);

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

  const handleWordClick = (lineIndex: number, wordIndex: number) => {
    setCurrentLine(lineIndex);
    setCurrentWord(wordIndex);
    saveProgress(lineIndex, wordIndex);
  };

  // Current word details panel
  const currentLineData = lines[currentLine];
  const currentWordData = currentLineData?.words[currentWord];

  return (
    <div className={`flex flex-col gap-4 ${isPlaying ? 'pb-32' : 'pb-28'}`}>
      {/* Current word spotlight */}
      {currentWordData && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 text-center border border-blue-200 sticky top-0 z-10">
          <div className="text-4xl font-bold mb-2" dir="rtl">{currentWordData.hebrew}</div>
          <div className="text-xl text-blue-700 font-medium">{currentWordData.transliteration}</div>
          <button
            onClick={() => speakHebrew(currentWordData.hebrew, speed)}
            className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
            Listen
          </button>
        </div>
      )}

      {/* Toggle image view */}
      <button
        onClick={() => setShowImage(!showImage)}
        className="text-sm text-gray-500 hover:text-gray-700 underline self-center"
      >
        {showImage ? 'Hide original image' : 'Show original image'}
      </button>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentLine * 100 + (currentWordData ? (currentWord / currentLineData.words.length) * 100 : 0)) / lines.length)}%`
            }}
          />
        </div>
        <span>
          Line {currentLine + 1}/{lines.length}
        </span>
      </div>

      {/* Lines */}
      <div className="flex flex-col gap-3">
        {lines.map((line) => (
          <div
            key={line.lineIndex}
            ref={line.lineIndex === currentLine ? activeLineRef : undefined}
          >
            <LineDisplay
              line={line}
              activeWordIndex={line.lineIndex === currentLine ? currentWord : null}
              completedUpTo={line.lineIndex === currentLine ? currentWord : line.lineIndex < currentLine ? line.words.length : 0}
              isActiveLine={line.lineIndex === currentLine}
              onWordClick={(wordIndex) => handleWordClick(line.lineIndex, wordIndex)}
            />
          </div>
        ))}
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
