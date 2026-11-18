import React, { useState, useRef } from 'react';
import { api } from '../services/api';

interface UploadDemoPageProps {
  onUploadSuccess: (analysisId: string) => void;
}

export const UploadDemoPage: React.FC<UploadDemoPageProps> = ({ onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setErrorMsg(null);
    setResultId(null);
    if (!file.name.toLowerCase().endsWith('.dem')) {
      setErrorMsg('Invalid file format. Only CS2 replay files (.dem) are supported.');
      return;
    }
    if (file.size === 0) {
      setErrorMsg('Selected file is empty (0 bytes).');
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmitUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setErrorMsg(null);
    setUploadProgress(20);

    try {
      setUploadProgress(50);
      const res = await api.uploadDemo(selectedFile);
      setUploadProgress(100);
      setResultId(res.analysis_id);
      setTimeout(() => {
        onUploadSuccess(res.analysis_id);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload demo');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Title & Technical Requirements Ribbon */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-cs-orange font-semibold">
            Sub-Tick Ingestion Pipeline
          </span>
          <span className="text-border-subtle font-mono text-xs">/</span>
          <span className="font-mono text-xs text-text-tertiary font-medium">CS2 PROTOCOL 14041</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Ingest Match Demo for Forensic Kinematics
        </h1>
        <p className="text-xs text-text-tertiary leading-relaxed">
          Upload official Valve CS2 or competitive (FACEIT/ESEA) 64/128-tick <code className="bg-surface-card px-1 py-0.5 rounded font-mono text-[11px] text-text-secondary border border-border-subtle">.dem</code> replay files for sub-tick trajectory and proof generation.
        </p>
      </div>

      {/* Main Upload Card */}
      <div className="bg-surface-card rounded-xl p-6 shadow-lg border border-border-subtle flex flex-col gap-5">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
            dragActive
              ? 'border-cs-orange bg-cs-orange/10'
              : 'border-border-subtle hover:border-cs-orange/50 hover:bg-surface-panel'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".dem"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="w-14 h-14 rounded-xl bg-cs-orange/10 border border-cs-orange/30 text-cs-orange flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-3xl">cloud_upload</span>
          </div>

          <div className="flex flex-col items-center text-center gap-1">
            <span className="font-bold text-sm text-text-primary">
              Drag &amp; Drop CS2 Demo File Here
            </span>
            <span className="text-xs text-text-tertiary">
              or <span className="text-cs-orange font-semibold underline">browse local storage</span>
            </span>
            <span className="font-mono text-[11px] text-text-tertiary mt-2">
              Validates Source 2 PBDEMS2 container header automatically
            </span>
          </div>
        </div>

        {/* Selected File Details */}
        {selectedFile && (
          <div className="p-4 rounded-xl bg-surface-panel border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-cs-orange/15 text-cs-orange">
                <span className="material-symbols-outlined text-2xl">description</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-text-primary font-mono truncate max-w-md">
                  {selectedFile.name}
                </span>
                <span className="font-mono text-xs text-text-tertiary">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • CS2 Binary Demo
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
                setErrorMsg(null);
              }}
              disabled={uploading}
              className="p-1.5 rounded-lg hover:bg-surface-card text-text-tertiary hover:text-cs-red transition-colors self-end sm:self-center"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="flex flex-col gap-1.5 font-mono text-xs">
            <div className="flex justify-between items-center text-text-secondary">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined animate-spin text-sm text-cs-orange">sync</span>
                Parsing &amp; sliding window generation...
              </span>
              <span className="font-bold text-text-primary">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded bg-surface-panel overflow-hidden border border-border-subtle">
              <div
                className="h-full bg-gradient-to-r from-cs-orange to-amber-500 rounded transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-cs-red/10 border border-cs-red/30 flex items-center gap-2.5 text-xs text-cs-red font-medium">
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Confirmation */}
        {resultId && (
          <div className="p-3.5 rounded-xl bg-cs-green/10 border border-cs-green/30 flex items-center gap-2.5 text-xs text-cs-green font-medium">
            <span className="material-symbols-outlined text-base shrink-0">check_circle</span>
            <span>Demo analyzed successfully! Redirecting to forensic match timeline...</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-border-subtle flex-wrap gap-3">
          <span className="font-mono text-xs text-text-tertiary">
            Local replays stored in <code className="bg-surface-panel px-1.5 py-0.5 rounded text-text-secondary border border-border-subtle">sample_demos/</code>
          </span>
          <button
            onClick={handleSubmitUpload}
            disabled={!selectedFile || uploading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono font-bold transition-all shadow-md ${
              !selectedFile || uploading
                ? 'bg-surface-panel text-text-tertiary border border-border-subtle cursor-not-allowed'
                : 'bg-gradient-to-r from-cs-orange to-amber-600 hover:from-orange-600 hover:to-amber-700 text-black shadow-cs-orange/20 active:scale-95'
            }`}
          >
            <span className="material-symbols-outlined text-sm">rocket_launch</span>
            <span>START FORENSIC INGESTION</span>
          </button>
        </div>
      </div>
    </div>
  );
};
