'use client';

import { HebrewWord } from '@/lib/types';
import { speakHebrew } from '@/lib/speech';

interface WordCardProps {
  word: HebrewWord;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}

export default function WordCard({ word, isActive, isCompleted, onClick }: WordCardProps) {
  const handleClick = () => {
    speakHebrew(word.hebrew);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex flex-col items-center px-3 py-2 rounded-lg transition-all duration-200
        border-2 cursor-pointer select-none
        ${isActive
          ? 'bg-yellow-100 border-yellow-400 scale-110 shadow-lg'
          : isCompleted
            ? 'bg-green-50 border-green-300'
            : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
        }
      `}
    >
      <span className="text-2xl font-bold text-gray-900 leading-tight" dir="rtl">
        {word.hebrew}
      </span>
      <span className={`text-sm mt-1 ${isActive ? 'text-yellow-700 font-semibold' : 'text-blue-600'}`}>
        {word.transliteration}
      </span>
    </button>
  );
}
