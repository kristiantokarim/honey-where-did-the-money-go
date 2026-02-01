import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface MultiFileUploadProps {
  loading: boolean;
  onFilesSelect: (files: File[]) => void;
}

export function MultiFileUpload({ loading, onFilesSelect }: MultiFileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).filter((file) =>
      file.type.startsWith('image/'),
    );

    if (newFiles.length === 0) return;

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleUpload = useCallback(() => {
    if (selectedFiles.length === 0) return;
    onFilesSelect(selectedFiles);
  }, [selectedFiles, onFilesSelect]);

  const clearAll = useCallback(() => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviews([]);
  }, [previews]);

  if (selectedFiles.length === 0) {
    return (
      <label
        className={`mt-4 block cursor-pointer h-64 border-4 border-dashed rounded-[2.5rem] bg-white flex flex-col items-center justify-center transition-all ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-200 hover:border-slate-300'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload size={32} className="text-blue-600 mb-2" />
        <p className="font-black text-slate-400 uppercase text-xs">
          Tap or Drop Images
        </p>
        <p className="text-slate-400 text-xs mt-1">Select multiple files</p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleInputChange}
          accept="image/*"
          multiple
          disabled={loading}
        />
      </label>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-slate-600">
          {selectedFiles.length} image(s) selected
        </span>
        <button
          onClick={clearAll}
          className="text-sm text-slate-500 hover:text-slate-700"
          disabled={loading}
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {previews.map((preview, index) => (
          <div
            key={index}
            className="relative aspect-square rounded-xl overflow-hidden bg-slate-100"
          >
            <img
              src={preview}
              alt={`Preview ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => removeFile(index)}
              className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white hover:bg-black/70"
              disabled={loading}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        <label
          className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-slate-400 bg-white"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <ImageIcon size={24} className="text-slate-400" />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleInputChange}
            accept="image/*"
            multiple
            disabled={loading}
          />
        </label>
      </div>

      <button
        onClick={handleUpload}
        disabled={loading || selectedFiles.length === 0}
        className="w-full bg-slate-900 py-4 rounded-2xl font-bold text-white shadow-xl min-h-[56px] disabled:opacity-50"
      >
        {loading ? 'Uploading...' : `Upload ${selectedFiles.length} Image(s)`}
      </button>
    </div>
  );
}
