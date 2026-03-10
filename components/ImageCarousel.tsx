'use client';

import { useState } from 'react';
import { ComponentImage } from '@/lib/types';
import { useImageLoader } from '@/lib/hooks/useImageLoader';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCarouselProps {
  images: ComponentImage[];
  folderPath?: string;
}

export default function ImageCarousel({ images, folderPath }: ImageCarouselProps) {
  const { resolve: resolveImageSrc } = useImageLoader(images, folderPath || '');
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full bg-gray-100 rounded-lg p-12 text-center text-muted-foreground">
        Aucune image
      </div>
    );
  }

  const currentImage = images[currentIndex];

  function goToPrevious() {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }

  function goToNext() {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }

  return (
    <div className="space-y-4">
      {/* Image principale */}
      <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden">
        <img
          src={resolveImageSrc(currentImage)}
          alt={currentImage.caption || `Image ${currentIndex + 1}`}
          className="w-full max-h-96 object-contain"
        />

        {/* Navigation gauche/droite */}
        {images.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full shadow-lg"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full shadow-lg"
              onClick={goToNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* 🆕 Badge "Image principale" supprimé */}

        {/* Compteur */}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Caption */}
      {currentImage.caption && (
        <p className="text-sm text-center text-muted-foreground italic">
          {currentImage.caption}
        </p>
      )}

      {/* Miniatures */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setCurrentIndex(index)}
              className={`relative flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden ${
                index === currentIndex
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <img
                src={resolveImageSrc(image)}
                alt={image.caption || `Miniature ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {image.isPrimary && (
                <div className="absolute top-0 left-0 bg-blue-500 text-white text-[10px] px-1">
                  ★
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}