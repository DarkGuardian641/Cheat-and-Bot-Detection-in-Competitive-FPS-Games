import React, { useState, useRef } from 'react';
import { FileUp, FileVideo, X } from 'lucide-react';
import { api, HealthInfo } from '../services/api';
import { Callout, PageHeader } from '../components/ui';

interface UploadDemoPageProps {
  health?: HealthInfo | null;
  onUploadSuccess: (analysisId: string) => void;
}

const MAX_MB = 500; // mirrors backend MAX_DEMO_SIZE_MB

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const UploadDemoPage: React.FC<UploadDemoPageProps> = ({ health, onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelected(e.dataTransfer.files[0]);
  };

  const handleFileSelected = (file: File) => {
    setErrorMsg(null);
    const lowerName = file.name.toLowerCase();
    const isDem = lowerName.endsWith('.dem');
    const isParquet = lowerName.endsWith('.parquet');

    if (!isDem && !isParquet) {
      setErrorMsg(`${file.name} is not a valid file. Please select a CS2 match replay (.dem) or dataset match (.parquet).`);
      return;
    }
    if (file.size === 0) {
      setErrorMsg(`${file.name} is empty. The download may not have finished.`);
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setErrorMsg(`${file.name} is ${formatSize(file.size)}. The backend accepts files up to ${MAX_MB} MB.`);
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmitUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setErrorMsg(null);
    setProgress(0);
    try {
      const res = await api.uploadDemo(selectedFile, setProgress);
      onUploadSuccess(res.analysis_id);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed.');
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Upload a match"
        description="Choose a CS2 match replay (.dem) or dataset match (.parquet). Once it uploads, the backend scores every player and the forensic report opens here."
      />

      {health && !health.model_exists && (
        <Callout tone="warn" title="No trained model on disk">
          The upload will be accepted, but analysis will fail until{' '}
          <code className="font-mono text-[0.8125rem] text-ink">models/{health.default_model}</code> exists.
        </Callout>
      )}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed transition-colors ${
          dragActive ? 'border-ember bg-ember-soft' : 'border-line-strong bg-surface'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".dem,.parquet"
          className="sr-only"
          id="demo-file"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
            e.target.value = '';
          }}
        />

        {selectedFile ? (
          <div className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sunken text-ink-2">
              <FileVideo size={20} strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-ink" title={selectedFile.name}>
                {selectedFile.name}
              </div>
              <div className="num text-sm text-ink-3">
                {uploading
                  ? progress < 1
                    ? `Uploading · ${Math.round(progress * 100)}% of ${formatSize(selectedFile.size)}`
                    : 'Upload complete, starting analysis'
                  : formatSize(selectedFile.size)}
              </div>
              {uploading && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-sunken">
                  <div
                    className="h-full rounded-full bg-ember transition-[width] duration-200 ease-out"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              )}
            </div>
            {!uploading && (
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setErrorMsg(null);
                }}
                className="btn-ghost h-8 w-8 px-0"
                aria-label="Remove file"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ) : (
          <label
            htmlFor="demo-file"
            className="flex cursor-pointer flex-col items-center px-6 py-14 text-center"
          >
            <FileUp size={24} strokeWidth={1.6} className="mb-3 text-ink-3" />
            <span className="font-medium text-ink">Drop a .dem or .parquet file here</span>
            <span className="mt-1 text-sm text-ink-2">
              or <span className="link">choose one from your computer</span>
            </span>
            <span className="mt-3 text-xs text-ink-3">Up to {MAX_MB} MB</span>
          </label>
        )}
      </div>

      {errorMsg && (
        <p role="alert" className="mt-3 text-sm text-flag">
          {errorMsg}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button onClick={handleSubmitUpload} disabled={!selectedFile || uploading} className="btn-primary">
          {uploading ? 'Uploading…' : 'Upload and analyze'}
        </button>
        {!selectedFile && (
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
            Choose file
          </button>
        )}
      </div>

      <div className="mt-12 border-t border-line pt-6 text-sm text-ink-2">
        <h2 className="font-medium text-ink">What happens next</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 marker:text-ink-3">
          <li>The backend checks the file header and stores the demo in <code className="font-mono text-[0.8125rem]">data/demos</code>.</li>
          <li>It extracts tick telemetry and cuts each player's play into 256-tick windows.</li>
          <li>The model scores each window; players over the threshold are flagged for review.</li>
        </ol>
      </div>
    </div>
  );
};
