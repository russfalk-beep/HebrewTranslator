'use client';

import { HebrewLine } from '@/lib/types';
import { speakHebrew } from '@/lib/speech';
import WordCard from './WordCard';

interface LineDisplayProps {
  line: HebrewLine;
  activeWordIndex: number | null;
  completedUpTo: number;
  isActiveLine: boolean;
  onWordClick: (wordIndex: number) => void;
}

export default function LineDisplay({
  line,
  activeWordIndex,
  completedUpTo,
  isActiveLine,
  onWordClick,
}: LineDisplayProps) {
  const handlePlayLine = () => {
    speakHebrew(line.fullText);
  };

  return (
    <div
      className={`
        p-4 rounded-xl transition-all duration-300
        ${isActiveLine ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 border-2 border-transparent'}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Line {line.lineIndex + 1}
        </span>
        <button
          onClick={handlePlayLine}
          className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100 transition-colors"
          title="Play entire line"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
      </div>

      {/* Hebrew words displayed right-to-left */}
      <div className="flex flex-wrap gap-2 justify-end" dir="rtl">
        {line.words.map((word) => (
          <WordCard
            key={word.index}
            word={word}
            isActive={isActiveLine && activeWordIndex === word.index}
            isCompleted={isActiveLine && word.index < completedUpTo}
            onClick={() => onWordClick(word.index)}
          />
        ))}
      </div>
    </div>
  );
}
