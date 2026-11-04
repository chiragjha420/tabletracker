'use client';

import React, { useRef, useState } from 'react';
import { Camera, Upload, X, Check } from 'lucide-react';

interface PhotoUploaderProps {
  label: string;
  required?: boolean;
  onPhotoSelected: (dataUrl: string) => void;
  initialPhoto?: string | null;
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

  const handleFileProcess = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('Image must be under 15MB.');
      return;
    }

    setIsUploading(true);
    setProgress(20);

    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 90);
        setProgress(percent);
      }
    };

    reader.onload = () => {
      const result = reader.result as string;
      setTimeout(() => {
        setProgress(100);
        setIsUploading(false);
        setPhotoPreview(result);
        onPhotoSelected(result);
      }, 250);
    };

    reader.onerror = () => {
      setIsUploading(false);
      setError('Failed to read image file. Please retry.');
    };

    reader.readAsDataURL(file);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoPreview(null);
    onPhotoSelected('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {photoPreview && (
          <span className="text-xs text-status-green-text flex items-center space-x-1 font-medium">
            <Check className="w-3.5 h-3.5" />
            <span>Attached</span>
          </span>
        )}
      </div>

      {photoPreview ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-surface-raised aspect-video max-h-56">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPreview}
            alt={label}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 text-foreground backdrop-blur-md border border-border hover:bg-background transition-colors"
            title="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface p-4 text-center">
          {isUploading ? (
            <div className="space-y-2 py-4">
              <div className="text-xs text-muted-foreground font-medium">Processing image... {progress}%</div>
              <div className="w-full bg-surface-raised rounded-full h-1.5 max-w-xs mx-auto overflow-hidden">
                <div
                  className="bg-foreground h-1.5 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              {/* Direct Camera Button (for phones) */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg border border-border bg-surface hover:bg-surface-raised transition-colors flex items-center justify-center space-x-2 text-foreground"
              >
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span>Take Photo</span>
              </button>

              {/* File Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg border border-border bg-surface hover:bg-surface-raised transition-colors flex items-center justify-center space-x-2 text-foreground"
              >
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span>Upload File</span>
              </button>
            </div>
          )}

          {/* Hidden Inputs */}
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

      {error && <p className="text-xs text-status-red-text">{error}</p>}
    </div>
  );
}
