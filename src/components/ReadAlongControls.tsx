'use client';

interface ReadAlongControlsProps {
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSpeedChange: (speed: number) => void;
}

export default function ReadAlongControls({
  isPlaying,
  speed,
  onPlay,
  onPause,
  onStop,
  onNext,
  onPrev,
  onSpeedChange,
}: ReadAlongControlsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg p-4 z-50">
      <div className="max-w-lg mx-auto">
        {/* Speed control */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-xs text-gray-500">Speed:</span>
          {[0.5, 0.8, 1.0, 1.2].map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                speed === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onPrev}
            className="p-3 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
            title="Previous word"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          {isPlaying ? (
            <button
              onClick={onPause}
              className="p-4 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white shadow-md transition-colors"
              title="Pause"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="p-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors"
              title="Play"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          )}

          <button
            onClick={onStop}
            className="p-3 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
            title="Stop"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h12v12H6z"/>
            </svg>
          </button>

          <button
            onClick={onNext}
            className="p-3 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
            title="Next word"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
