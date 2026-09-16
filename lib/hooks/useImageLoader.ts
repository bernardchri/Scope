import { useState, useEffect, useRef } from 'react';
import { ComponentImage } from '@/lib/types';
import { loadImageSrc, getImageSrc } from '@/lib/imageManager';

/**
 * Hook that loads image base64 from disk for folder-format images.
 * Returns a Map<imageId, base64DataUri> that updates as images load.
 */
export function useImageLoader(images: ComponentImage[], folderPath: string) {
  // Trace du filename effectivement chargé par image.id — l'id reste stable
  // d'un import Figma à l'autre (pins/légende préservés) mais le filename
  // change ; sans ça, le cache gardait l'ancienne image sous le même id.
  const loadedFilenames = useRef<Map<string, string>>(new Map());

  const [srcMap, setSrcMap] = useState<Map<string, string>>(() => {
    // Initialize with any already-cached or inline base64
    const map = new Map<string, string>();
    for (const img of images) {
      if (img.base64) {
        map.set(img.id, img.base64);
      } else if (img.filename) {
        const cached = getImageSrc(folderPath, img.filename);
        if (cached) map.set(img.id, cached);
      }
    }
    return map;
  });

  useEffect(() => {
    let cancelled = false;

    for (const img of images) {
      if (!img.filename || loadedFilenames.current.get(img.id) === img.filename) continue;

      loadImageSrc(folderPath, img.filename).then(base64 => {
        if (cancelled) return;
        loadedFilenames.current.set(img.id, img.filename!);
        setSrcMap(prev => {
          const next = new Map(prev);
          next.set(img.id, base64);
          return next;
        });
      });
    }

    return () => { cancelled = true; };
  }, [images, folderPath]);

  /** Resolve src for a single image (sync, returns undefined if not yet loaded) */
  function resolve(image: ComponentImage): string | undefined {
    return srcMap.get(image.id) || image.base64 || undefined;
  }

  return { resolve, srcMap };
}
