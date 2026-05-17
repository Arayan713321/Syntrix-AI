"use client";

import React, { useState, useRef, DragEvent } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface DragDropZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  isLoading: boolean;
}

export function DragDropZone({ onFileSelect, selectedFile, isLoading }: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = (file: File) => {
    setError(null);
    
    // 1. Enforce PDF only client-side (Audit 5.1 requirement)
    if (file.type !== "application/pdf") {
      setError("Supported format: PDF only.");
      return;
    }
    
    // 2. Enforce 5MB upload size limits client-side (Audit 1 & 5.1 requirement)
    if (file.size > 5 * 1024 * 1024) {
      setError("Maximum file size allowed is 5MB.");
      return;
    }

    // 3. Prevent duplicate uploads of the same file (Audit 5.1 requirement)
    if (selectedFile && selectedFile.name === file.name && selectedFile.size === file.size) {
      toast.error("This resume is already loaded", { id: "duplicate-file-toast" });
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isLoading) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isLoading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    if (isLoading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 p-8 flex flex-col items-center justify-center text-center min-h-[200px] ${
          isDragging
            ? "border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.25)]"
            : selectedFile
            ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-400/50"
            : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/30"
        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {/* Shimmer overlay when loading */}
        {isLoading && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/10 to-transparent animate-[shimmer_1.5s_infinite] pointer-events-none" />
        )}

        <input
          type="file"
          ref={fileInputRef}
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center gap-4 z-10">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
              selectedFile
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-zinc-900 text-zinc-400 group-hover:scale-115 group-hover:bg-zinc-800 group-hover:text-zinc-200"
            }`}
          >
            {selectedFile ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
          </div>

          <div className="flex flex-col gap-1">
            {selectedFile ? (
              <>
                <p className="text-emerald-400 font-semibold text-base flex items-center justify-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  {selectedFile.name}
                </p>
                <p className="text-zinc-500 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Active Resume</p>
              </>
            ) : (
              <>
                <p className="text-zinc-200 font-medium text-sm sm:text-base">
                  Drag & drop your resume PDF, or <span className="text-purple-400 underline decoration-purple-400/30 underline-offset-4 font-semibold group-hover:text-purple-300">browse</span>
                </p>
                <p className="text-zinc-500 text-xs">Supports only PDF documents (Max 5MB)</p>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm animate-shake">
          <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
