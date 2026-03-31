'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ImageCropperProps {
  imageDataUrl: string;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

interface CropRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export default function ImageCropper({ imageDataUrl, onCropComplete, onCancel }: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Get position relative to image
  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: Math.max(0, Math.min(clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(clientY - rect.top, rect.height)),
    };
  }, []);

  const handleStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    setIsDragging(true);
    setCrop({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
  }, [getPos]);

  const handleMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const pos = getPos(e);
    setCrop(prev => prev ? { ...prev, endX: pos.x, endY: pos.y } : null);
  }, [isDragging, getPos]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Prevent scrolling while dragging on touch
  useEffect(() => {
    const handler = (e: TouchEvent) => {
      if (isDragging) e.preventDefault();
    };
    document.addEventListener('touchmove', handler, { passive: false });
    return () => document.removeEventListener('touchmove', handler);
  }, [isDragging]);

  const handleCrop = () => {
    if (!crop || !imgRef.current) return;

    const img = imgRef.current;
    const displayW = img.clientWidth;
    const displayH = img.clientHeight;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    const scaleX = naturalW / displayW;
    const scaleY = naturalH / displayH;

    const x = Math.min(crop.startX, crop.endX) * scaleX;
    const y = Math.min(crop.startY, crop.endY) * scaleY;
    const w = Math.abs(crop.endX - crop.startX) * scaleX;
    const h = Math.abs(crop.endY - crop.startY) * scaleY;

    if (w < 20 || h < 20) {
      alert('Please select a larger area');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
    onCropComplete(canvas.toDataURL('image/jpeg', 0.9));
  };

  // Compute display rect
  const getDisplayRect = () => {
    if (!crop) return null;
    const left = Math.min(crop.startX, crop.endX);
    const top = Math.min(crop.startY, crop.endY);
    const width = Math.abs(crop.endX - crop.startX);
    const height = Math.abs(crop.endY - crop.startY);
    return { left, top, width, height };
  };

  const rect = getDisplayRect();

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Instructions */}
      <div className="bg-blue-600 text-white text-center py-3 px-4">
        <p className="font-semibold">Drag to select the Hebrew text area</p>
        <p className="text-sm text-blue-100">Exclude page numbers, titles, or anything you don&apos;t need</p>
      </div>

      {/* Image area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-start justify-center p-2"
      >
        <div className="relative inline-block select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageDataUrl}
            alt="Select area to translate"
            className="max-w-full max-h-[70vh] block"
            onLoad={() => setImageLoaded(true)}
            draggable={false}
          />

          {/* Touch/mouse overlay */}
          {imageLoaded && (
            <div
              className="absolute inset-0 cursor-crosshair"
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
            >
              {/* Darkened overlay outside selection */}
              {rect && rect.width > 5 && rect.height > 5 && (
                <>
                  {/* Top */}
                  <div className="absolute bg-black/50 left-0 right-0 top-0" style={{ height: `${rect.top}px` }} />
                  {/* Bottom */}
                  <div className="absolute bg-black/50 left-0 right-0 bottom-0" style={{ top: `${rect.top + rect.height}px` }} />
                  {/* Left */}
                  <div className="absolute bg-black/50 left-0" style={{ top: `${rect.top}px`, height: `${rect.height}px`, width: `${rect.left}px` }} />
                  {/* Right */}
                  <div className="absolute bg-black/50 right-0" style={{ top: `${rect.top}px`, height: `${rect.height}px`, left: `${rect.left + rect.width}px` }} />

                  {/* Selection border */}
                  <div
                    className="absolute border-2 border-blue-400 border-dashed"
                    style={{
                      left: `${rect.left}px`,
                      top: `${rect.top}px`,
                      width: `${rect.width}px`,
                      height: `${rect.height}px`,
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 p-4 bg-gray-900">
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            // Use full image if no selection
            if (!rect || rect.width < 20 || rect.height < 20) {
              onCropComplete(imageDataUrl);
            } else {
              handleCrop();
            }
          }}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {rect && rect.width > 20 ? 'Use Selection' : 'Use Full Image'}
        </button>
      </div>
    </div>
  );
}
