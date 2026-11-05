'use client';

import React, { useRef, useState } from 'react';
import { Camera, Upload, X, Check } from 'lucide-react';

interface PhotoUploaderProps {
  label: string;
  required?: boolean;
  onPhotoSelected: (dataUrl: string) => void;
  initialPhoto?: string | null;
}

/**
 * Compress and scale images client-side before upload.
 * Reduces 10MB phone camera photos down to ~100KB, preventing Supabase free tier storage exhaustion.
 */
function compressImage(file: File, maxDimension = 1200, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function PhotoUploader({
  label,
  required = false,
  onPhotoSelected,
  initialPhoto = null,
}: PhotoUploaderProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhoto);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('Image must be under 25MB.');
      return;
    }

    setIsUploading(true);
    setProgress(30);

    try {
      // 1. Client-side canvas compression: Resizes to max 1200px & 0.72 quality
      // Reduces 10MB phone camera photos down to ~100KB to protect Supabase free tier storage
      const compressedDataUrl = await compressImage(file, 1200, 0.72);
      setProgress(100);
      setIsUploading(false);
      setPhotoPreview(compressedDataUrl);
      onPhotoSelected(compressedDataUrl);
    } catch {
      setIsUploading(false);
      setError('Failed to process and compress image. Please try again.');
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoPreview(null);
    onPhotoSelected('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
        {photoPreview && (
          <span className="text-[11px] text-emerald-400 flex items-center space-x-1 font-medium">
            <Check className="w-3 h-3" />
            <span>Attached</span>
          </span>
        )}
      </div>

      {photoPreview ? (
        <div className="relative rounded-2xl overflow-hidden bg-surface-raised aspect-video max-h-52 border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPreview}
            alt={label}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition-colors"
            title="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-raised p-4 text-center border border-border">
          {isUploading ? (
            <div className="space-y-2 py-3">
              <div className="text-xs text-muted-foreground font-medium">Processing... {progress}%</div>
              <div className="w-full bg-neutral-800 rounded-full h-1 max-w-xs mx-auto overflow-hidden">
                <div
                  className="bg-foreground h-1 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-xs font-medium rounded-xl bg-surface hover:bg-surface-overlay transition-colors flex items-center justify-center space-x-2 text-foreground border border-border"
              >
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span>Take Photo</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-xs font-medium rounded-xl bg-surface hover:bg-surface-overlay transition-colors flex items-center justify-center space-x-2 text-foreground border border-border"
              >
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span>Upload File</span>
              </button>
            </div>
          )}

          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileProcess(e.target.files[0]);
            }}
          />
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileProcess(e.target.files[0]);
            }}
          />
        </div>
      )}

      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
