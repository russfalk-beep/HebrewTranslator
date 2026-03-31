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
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  const handleImageLoad = () => {
    setImageLoaded(true);
    if (imgRef.current) {
      setImgSize({
        w: imgRef.current.clientWidth,
        h: imgRef.current.clientHeight,
      });
    }
  };

  // Get coordinates relative to the image element
  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = imgRef.current.getBoundingClientRect();

    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return { x: 0, y: 0 };
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

  // Prevent scrolling on touch devices while dragging
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

    // Handle retina/HiDPI: use naturalWidth/Height for the source canvas
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const scaleX = naturalW / displayW;
    const scaleY = naturalH / displayH;

    // Crop coordinates in natural image pixels
    const sx = Math.round(Math.min(crop.startX, crop.endX) * scaleX);
    const sy = Math.round(Math.min(crop.startY, crop.endY) * scaleY);
    const sw = Math.round(Math.abs(crop.endX - crop.startX) * scaleX);
    const sh = Math.round(Math.abs(crop.endY - crop.startY) * scaleY);

    if (sw < 50 || sh < 50) {
      alert('Please select a larger area');
      return;
    }

    // Draw cropped image onto a canvas using a loaded Image (not the img element directly,
    // which can fail on some browsers with CORS)
    const sourceImg = new Image();
    sourceImg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, sw, sh);
      const result = canvas.toDataURL('image/png');
      onCropComplete(result);
    };
    sourceImg.src = imageDataUrl;
  };

  // Display rect for the selection box
  const rect = crop ? {
    left: Math.min(crop.startX, crop.endX),
    top: Math.min(crop.startY, crop.endY),
    width: Math.abs(crop.endX - crop.startX),
    height: Math.abs(crop.endY - crop.startY),
  } : null;

  const hasSelection = rect && rect.width > 20 && rect.height > 20;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white text-center py-3 px-4 flex-shrink-0">
        <p className="font-semibold text-lg">Select the text area</p>
        <p className="text-sm text-blue-100">Drag a box around the Hebrew text you want to read</p>
      </div>

      {/* Image with selection overlay */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-2">
        <div className="relative inline-block select-none" style={{ touchAction: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageDataUrl}
            alt="Select area"
            className="block"
            style={{ maxWidth: '100%', maxHeight: '65vh' }}
            onLoad={handleImageLoad}
            draggable={false}
          />

          {/* Touch/mouse overlay for drawing selection */}
          {imageLoaded && (
            <div
              className="absolute inset-0"
              style={{ cursor: 'crosshair' }}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
            >
              {/* Dim area outside selection */}
              {hasSelection && (
                <>
                  <div className="absolute bg-black/50 left-0 right-0 top-0" style={{ height: `${rect.top}px` }} />
                  <div className="absolute bg-black/50 left-0 right-0" style={{ top: `${rect.top + rect.height}px`, bottom: 0 }} />
                  <div className="absolute bg-black/50 left-0" style={{ top: `${rect.top}px`, height: `${rect.height}px`, width: `${rect.left}px` }} />
                  <div className="absolute bg-black/50" style={{ top: `${rect.top}px`, height: `${rect.height}px`, left: `${rect.left + rect.width}px`, right: 0 }} />
                  {/* Selection border */}
                  <div
                    className="absolute border-3 border-blue-400"
                    style={{
                      left: `${rect.left}px`,
                      top: `${rect.top}px`,
                      width: `${rect.width}px`,
                      height: `${rect.height}px`,
                      borderWidth: '3px',
                      borderStyle: 'solid',
                      borderColor: '#60a5fa',
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="flex-shrink-0 p-4 bg-gray-900 space-y-3">
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={hasSelection ? handleCrop : () => onCropComplete(imageDataUrl)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {hasSelection ? 'Use Selection' : 'Use Full Image'}
          </button>
        </div>
        {hasSelection && (
          <button
            onClick={() => setCrop(null)}
            className="w-full text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>
    </div>
  );
}
