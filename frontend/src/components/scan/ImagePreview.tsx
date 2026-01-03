import { ChevronUp, ChevronDown, Maximize2, X } from 'lucide-react';

interface ImagePreviewProps {
  imageUrl: string;
  showImage: boolean;
  isZoomed: boolean;
  onToggle: () => void;
  onZoom: () => void;
  onCloseZoom: () => void;
}

export function ImagePreview({
  imageUrl,
  showImage,
  isZoomed,
  onToggle,
  onZoom,
  onCloseZoom,
}: ImagePreviewProps) {
  return (
    <>
      {/* Lightbox */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={onCloseZoom}
        >
          <button
            onClick={onCloseZoom}
            className="absolute top-6 right-6 bg-white/10 text-white p-3 rounded-full backdrop-blur-md active:scale-90 min-w-[44px] min-h-[44px]"
          >
            <X size={24} />
          </button>
          <img
            src={imageUrl}
            alt="Full Screenshot"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Collapsible Preview */}
      <div
        className={`transition-all duration-300 ${
          showImage ? 'h-64' : 'h-12'
        } bg-slate-900 sticky top-[70px] z-40 overflow-hidden rounded-[2rem] shadow-xl mb-4`}
      >
        {showImage ? (
          <div className="relative h-full w-full flex items-center justify-center">
            <img src={imageUrl} alt="Receipt" className="h-full object-contain" />
            <div className="absolute bottom-3 right-3 flex gap-2">
              <button
                onClick={onZoom}
                className="bg-white/20 backdrop-blur-lg text-white p-2 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Maximize2 size={16} />
              </button>
              <button
                onClick={onToggle}
                className="bg-white/20 backdrop-blur-lg text-white p-2 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ChevronUp size={16} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onToggle}
            className="w-full h-full text-white text-[10px] font-black uppercase flex items-center justify-center gap-2 min-h-[44px]"
          >
            <ChevronDown size={14} /> View Reference
          </button>
        )}
      </div>
    </>
  );
}
