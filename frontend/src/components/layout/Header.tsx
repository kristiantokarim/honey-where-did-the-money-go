import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useUpload } from '../../context/UploadContext';

export function Header() {
  const navigate = useNavigate();
  const { isUploading, progress } = useUpload();

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-center items-center shadow-sm">
      <h1 className="text-xl font-black text-blue-600 tracking-tight">HONEY WHERE DID THE MONEY GO</h1>

      {isUploading && (
        <button
          onClick={() => navigate({ to: '/scan' })}
          className="absolute right-4 flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse"
        >
          <Loader2 size={14} className="animate-spin" />
          {progress.message}
        </button>
      )}
    </nav>
  );
}
