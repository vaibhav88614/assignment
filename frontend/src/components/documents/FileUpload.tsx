import { useCallback, useState, type DragEvent } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { DocumentType } from '../../types';
import { DOCUMENT_TYPE_LABELS, formatFileSize } from '../../utils/constants';

interface FileUploadProps {
  onUpload: (file: File, documentType: DocumentType) => Promise<void>;
  uploading?: boolean;
}

export default function FileUpload({ onUpload, uploading }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>(DocumentType.OTHER);

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
    await onUpload(selectedFile, docType);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          Drag and drop a file here, or{' '}
          <label className="text-indigo-600 hover:text-indigo-700 cursor-pointer font-medium">
            browse
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleChange}
            />
          </label>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          PDF, JPG, PNG up to 10MB
        </p>
      </div>

      {selectedFile && (
        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
          <FileText className="h-5 w-5 text-gray-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {selectedFile && (
        <div className="flex items-center gap-3">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}
    </div>
  );
}
