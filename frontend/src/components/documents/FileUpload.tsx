import { useCallback, useRef, useState, type DragEvent } from 'react';
import { Upload, X, FileText, UploadCloud } from 'lucide-react';
import { DocumentType } from '../../types';
import { DOCUMENT_TYPE_LABELS, formatFileSize } from '../../utils/constants';

interface FileUploadProps {
  onUpload: (file: File, documentType: DocumentType) => Promise<void>;
  uploading?: boolean;
  documentType?: DocumentType;
}

export default function FileUpload({ onUpload, uploading, documentType }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>(documentType ?? DocumentType.OTHER);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile, documentType ?? docType);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragActive
            ? 'border-indigo-400 bg-indigo-50/60'
            : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleChange}
        />
        <div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
          <UploadCloud className="h-5 w-5 text-slate-500" />
        </div>
        <p className="text-sm text-slate-700">
          Drag and drop a file here, or{' '}
          <span className="text-indigo-600 hover:text-indigo-700 font-medium underline-offset-2 hover:underline">
            browse
          </span>
        </p>
        <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG up to 10MB</p>
      </div>

      {selectedFile && (
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 shadow-sm animate-fade-in">
          <div className="h-9 w-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-slate-500">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {selectedFile && !documentType && (
        <div className="flex items-center gap-2.5">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          >
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 bg-gradient-to-b from-indigo-500 to-indigo-700 text-white px-4 py-2 rounded-lg hover:brightness-105 disabled:opacity-50 text-sm font-medium transition shadow-sm"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}
    </div>
  );
}
