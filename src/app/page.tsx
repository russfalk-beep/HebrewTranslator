'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SavedPage } from '@/lib/types';
import { getSavedPages, deletePage, savePage } from '@/lib/storage';
import { processImage } from '@/lib/ocr';
import ImageCapture from '@/components/ImageCapture';
import ProcessingOverlay from '@/components/ProcessingOverlay';

export default function Home() {
  const router = useRouter();
  const [pages, setPages] = useState<SavedPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCapture, setShowCapture] = useState(false);

  useEffect(() => {
    setPages(getSavedPages());
  }, []);

  const handleImageCaptured = async (_file: File, dataUrl: string) => {
    setIsProcessing(true);
    setProgress(0);
    setShowCapture(false);

    try {
      const lines = await processImage(dataUrl, (p) => setProgress(p));

      if (lines.length === 0) {
        alert('No Hebrew text was detected in the image. Please try again with a clearer photo.');
        setIsProcessing(false);
        return;
      }

      const newPage: SavedPage = {
        id: crypto.randomUUID(),
        name: `Page ${pages.length + 1} - ${new Date().toLocaleDateString()}`,
        imageDataUrl: dataUrl,
        lines,
        currentLineIndex: 0,
        currentWordIndex: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      savePage(newPage);
      setIsProcessing(false);
      router.push(`/page/${newPage.id}`);
    } catch (error) {
      console.error('OCR failed:', error);
      alert('Failed to process the image. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this page?')) {
      deletePage(id);
      setPages(getSavedPages());
    }
  };

  const sortedPages = [...pages].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
      {isProcessing && <ProcessingOverlay progress={progress} />}

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Hebrew Tutor
        </h1>
        <p className="text-gray-500">
          Snap a photo of Hebrew text to start learning
        </p>
      </div>

      {/* New Page Button / Camera */}
      {showCapture ? (
        <div className="mb-8">
          <ImageCapture onImageCaptured={handleImageCaptured} />
          <button
            onClick={() => setShowCapture(false)}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700 w-full text-center"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCapture(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl mb-8 flex items-center justify-center gap-3 text-lg transition-colors shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Page
        </button>
      )}

      {/* Saved Pages */}
      {sortedPages.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Your Pages</h2>
          <div className="flex flex-col gap-3">
            {sortedPages.map((page) => {
              const totalWords = page.lines.reduce((sum, l) => sum + l.words.length, 0);
              const completedWords = page.lines
                .slice(0, page.currentLineIndex)
                .reduce((sum, l) => sum + l.words.length, 0) + page.currentWordIndex;
              const progressPercent = totalWords > 0 ? Math.round((completedWords / totalWords) * 100) : 0;

              return (
                <div
                  key={page.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => router.push(`/page/${page.id}`)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={page.imageDataUrl}
                          alt={page.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{page.name}</h3>
                        <p className="text-sm text-gray-500">
                          {page.lines.length} lines, {totalWords} words
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-green-500 h-1.5 rounded-full"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{progressPercent}%</span>
                        </div>
                      </div>
                    </div>
                  </button>
                  <div className="border-t border-gray-100 px-4 py-2 flex justify-end">
                    <button
                      onClick={() => handleDelete(page.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sortedPages.length === 0 && !showCapture && (
        <div className="text-center py-12 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 opacity-50">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <p>No pages yet. Tap &quot;New Page&quot; to get started!</p>
        </div>
      )}
    </main>
  );
}
