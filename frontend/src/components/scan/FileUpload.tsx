import { Upload, Loader2 } from 'lucide-react';
import type { ChangeEvent } from 'react';

interface FileUploadProps {
  loading: boolean;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function FileUpload({ loading, onFileSelect }: FileUploadProps) {
  return (
    <label className="mt-8 block cursor-pointer group h-64 border-4 border-dashed border-slate-200 rounded-[2.5rem] bg-white flex flex-col items-center justify-center transition-all active:scale-95">
      {loading ? (
        <Loader2 className="animate-spin text-blue-500" size={32} />
      ) : (
        <>
          <Upload size={32} className="text-blue-600 mb-2" />
          <p className="font-black text-slate-400 uppercase text-xs">Tap to Scan</p>
        </>
      )}
      <input
        type="file"
        className="hidden"
        onChange={onFileSelect}
        accept="image/*"
        disabled={loading}
      />
    </label>
  );
}
