'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { HebrewLine, HebrewWord } from '@/lib/types';
import { speakHebrew, stopSpeaking, initVoices, getAvailableHebrewVoices, setVoice } from '@/lib/speech';
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
  const [showEnglish, setShowEnglish] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  const isPlayingRef = useRef(false);

  useEffect(() => {
    initVoices().then(() => {
      const available = getAvailableHebrewVoices();
      setVoices(available);
    });
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) setDisplayWidth(containerRef.current.offsetWidth);
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

      try { await speakHebrew(word.hebrew, speed); } catch { /* ok */ }
      if (!isPlayingRef.current) break;

      const nextWord = allWords[flatIdx + 1];
      const isNewLine = nextWord && nextWord.lineIdx !== lineIdx;
      await new Promise(resolve => setTimeout(resolve, isNewLine ? 600 : 300));
      flatIdx++;
    }

    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [currentFlatIndex, allWords, speed, saveProgress]);

  const handlePause = () => { isPlayingRef.current = false; setIsPlaying(false); stopSpeaking(); };
  const handleStop = () => { isPlayingRef.current = false; setIsPlaying(false); stopSpeaking(); setCurrentLine(0); setCurrentWord(0); saveProgress(0, 0); };

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
        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold flex-shrink-0" dir="rtl">{currentWordData.hebrew}</div>
            <div className="flex-1 min-w-0">
              <div className="text-blue-700 font-bold text-lg">{currentWordData.transliteration}</div>
              {showEnglish && currentWordData.translation && (
                <div className="text-gray-500 text-sm">{currentWordData.translation}</div>
              )}
            </div>
            <button
              onClick={() => speakHebrew(currentWordData.hebrew, speed)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full flex-shrink-0 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {/* English toggle */}
        <button
          onClick={() => setShowEnglish(!showEnglish)}
          className={`text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
            showEnglish
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}
        >
          {showEnglish ? 'English: ON' : 'English: OFF'}
        </button>

        {/* Voice picker */}
        {voices.length > 0 && (
          <button
            onClick={() => setShowVoicePicker(!showVoicePicker)}
            className="text-sm font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 transition-colors hover:bg-blue-50"
          >
            Voice {selectedVoiceName ? `(${selectedVoiceName})` : ''}
          </button>
        )}
      </div>

      {/* Voice picker dropdown */}
      {showVoicePicker && voices.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-3">
          <p className="text-xs text-gray-400 mb-2">Choose a Hebrew voice:</p>
          <div className="flex flex-col gap-1">
            {voices.map((voice, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setVoice(voice);
                  setSelectedVoiceName(voice.name.split(' ').slice(0, 2).join(' '));
                  setShowVoicePicker(false);
                  speakHebrew('שלום', speed);
                }}
                className="text-left text-sm px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <span className="font-medium">{voice.name}</span>
                <span className="text-gray-400 text-xs ml-2">({voice.lang})</span>
                {!voice.localService && <span className="text-blue-500 text-xs ml-1">cloud</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image with ONLY highlight boxes — no text on image */}
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden border-2 border-gray-200 shadow-md"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageDataUrl} alt="Hebrew page" className="w-full block" draggable={false} />

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
              <button
                key={`${line.lineIndex}-${word.index}`}
                onClick={() => handleWordClick(line.lineIndex, word.index, word)}
                className="absolute transition-all duration-200 cursor-pointer"
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  backgroundColor: isActive
                    ? 'rgba(250, 204, 21, 0.45)'
                    : isCompleted
                      ? 'rgba(134, 239, 172, 0.2)'
                      : 'transparent',
                  borderBottom: isActive
                    ? '3px solid #f59e0b'
                    : isCompleted
                      ? '2px solid rgba(34, 197, 94, 0.4)'
                      : 'none',
                  zIndex: isActive ? 10 : 1,
                }}
              />
            );
          })
        )}
      </div>

      {/* Clean line-by-line reading panel below the image */}
      <div className="flex flex-col gap-2">
        {lines.map((line) => {
          const isActiveLine = line.lineIndex === currentLine;
          return (
            <div
              key={line.lineIndex}
              className={`rounded-lg p-2 transition-all ${
                isActiveLine ? 'bg-yellow-50 border border-yellow-200' : 'bg-white border border-gray-100'
              }`}
            >
              {/* Words in this line */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end" dir="rtl">
                {line.words.map((word) => {
                  const isActive = isActiveLine && word.index === currentWord;
                  const isCompleted = line.lineIndex < currentLine ||
                    (isActiveLine && word.index < currentWord);

                  return (
                    <button
                      key={word.index}
                      onClick={() => handleWordClick(line.lineIndex, word.index, word)}
                      className={`flex flex-col items-center px-1 py-0.5 rounded transition-all ${
                        isActive
                          ? 'bg-yellow-200 scale-105'
                          : isCompleted
                            ? 'opacity-60'
                            : 'hover:bg-blue-50'
                      }`}
                    >
                      <span className="text-base font-bold text-gray-900">{word.hebrew}</span>
                      <span className={`text-xs font-semibold ${isActive ? 'text-amber-700' : 'text-blue-600'}`}>
                        {word.transliteration}
                      </span>
                      {showEnglish && word.translation && (
                        <span className="text-[10px] text-gray-400 italic">{word.translation}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${allWords.length > 0 ? ((currentFlatIndex + 1) / allWords.length) * 100 : 0}%` }}
          />
        </div>
        <span>{currentFlatIndex + 1}/{allWords.length}</span>
      </div>

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
