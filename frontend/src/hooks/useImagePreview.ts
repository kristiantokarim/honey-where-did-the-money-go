import { useState, useCallback, useEffect } from 'react';

export function useImagePreview() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const setPreviewFromFile = useCallback((file: File) => {
    // Revoke previous URL to prevent memory leak
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    // Keep collapsed - user can expand if they want to compare
  }, [previewUrl]);

  const setPreviewFromUrl = useCallback((url: string) => {
    // Revoke previous local URL if exists
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(url);
    // Keep collapsed - user can expand if they want to compare
  }, [previewUrl]);

  const clearPreview = useCallback(() => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setShowImage(false);
    setIsZoomed(false);
  }, [previewUrl]);

  const toggleImage = useCallback(() => {
    setShowImage((prev) => !prev);
  }, []);

  const openZoom = useCallback(() => {
    setIsZoomed(true);
  }, []);

  const closeZoom = useCallback(() => {
    setIsZoomed(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return {
    previewUrl,
    showImage,
    isZoomed,
    setPreviewFromFile,
    setPreviewFromUrl,
    clearPreview,
    toggleImage,
    openZoom,
    closeZoom,
  };
}
