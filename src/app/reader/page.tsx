'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SavedPage } from '@/lib/types';
import { getPage, updateProgress } from '@/lib/storage';
import PageViewer from '@/components/PageViewer';

function ReaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [page, setPage] = useState<SavedPage | null>(null);
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    if (!id) {
      router.push('/HebrewTranslator');
      return;
    }
    const savedPage = getPage(id);
    if (!savedPage) {
      router.push('/HebrewTranslator');
      return;
    }
    setPage(savedPage);
  }, [id, router]);

  const handleProgressChange = (lineIndex: number, wordIndex: number) => {
    if (page) {
      updateProgress(page.id, lineIndex, wordIndex);
    }
  };

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"/>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.push('/HebrewTranslator')}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900 flex-1 truncate">{page.name}</h1>
        <button
          onClick={() => setShowImage(!showImage)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showImage ? 'Hide Image' : 'Show Image'}
        </button>
      </div>

      {/* Original image */}
      {showImage && (
        <div className="mb-4 rounded-xl overflow-hidden border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.imageDataUrl}
            alt="Original page"
            className="w-full"
          />
        </div>
      )}

      {/* Page content with read-along */}
      <PageViewer
        lines={page.lines}
        initialLineIndex={page.currentLineIndex}
        initialWordIndex={page.currentWordIndex}
        onProgressChange={handleProgressChange}
      />
    </main>
  );
}

export default function ReaderPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"/>
      </div>
    }>
      <ReaderContent />
    </Suspense>
  );
}
