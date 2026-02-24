'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ComponentImage, ImagePin, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface ImagePinViewerProps {
  images: ComponentImage[];
  tasks: Task[];
  onUpdateImages: (images: ComponentImage[]) => void;
}

export default function ImagePinViewer({ images, tasks, onUpdateImages }: ImagePinViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPins, setShowPins] = useState(true);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  // Local copy of images for live drag updates (avoids saving on every move)
  const [localImages, setLocalImages] = useState(images);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  // Clamp index when images change
  useEffect(() => {
    if (currentIndex >= localImages.length && localImages.length > 0) {
      setCurrentIndex(localImages.length - 1);
    }
  }, [localImages.length, currentIndex]);

  // Delete selected pin on keyboard Delete
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' || !selectedPinId) return;
      const currentImage = localImages[currentIndex];
      if (!currentImage) return;

      const updatedImages = localImages.map((img, i) =>
        i === currentIndex
          ? { ...img, pins: (img.pins ?? []).filter(p => p.id !== selectedPinId) }
          : img
      );
      setLocalImages(updatedImages);
      setSelectedPinId(null);
      onUpdateImages(updatedImages);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPinId, localImages, currentIndex, onUpdateImages]);

  if (!localImages || localImages.length === 0) {
    return (
      <div className="w-full bg-muted rounded-lg p-12 text-center text-muted-foreground">
        Aucune image
      </div>
    );
  }

  const currentImage = localImages[currentIndex];
  const currentPins = currentImage.pins ?? [];

  function getNextPinNumber(): number {
    if (currentPins.length === 0) return 1;
    return Math.max(...currentPins.map(p => p.number)) + 1;
  }

  function updateCurrentImagePins(pins: ImagePin[], save = false) {
    const updated = localImages.map((img, i) =>
      i === currentIndex ? { ...img, pins } : img
    );
    setLocalImages(updated);
    if (save) onUpdateImages(updated);
  }

  // --- Pointer events on the image container ---

  function handleContainerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Only react to primary button on the container itself (not bubbled from a pin)
    if (e.button !== 0) return;
    if (!imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPin: ImagePin = {
      id: crypto.randomUUID(),
      number: getNextPinNumber(),
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };

    const newPins = [...currentPins, newPin];
    updateCurrentImagePins(newPins);
    setSelectedPinId(newPin.id);
    setDraggingPinId(newPin.id);
    // Capture pointer so we receive move/up even if cursor leaves element
    imageContainerRef.current.setPointerCapture(e.pointerId);
  }

  function handleContainerPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingPinId || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const updatedPins = currentPins.map(p =>
      p.id === draggingPinId ? { ...p, x, y } : p
    );
    updateCurrentImagePins(updatedPins, false); // no save yet
  }

  function handleContainerPointerUp() {
    if (!draggingPinId) return;
    setDraggingPinId(null);
    // Save final position
    const updated = localImages.map((img, i) =>
      i === currentIndex ? { ...img, pins: localImages[currentIndex].pins } : img
    );
    onUpdateImages(updated);
  }

  function handlePinPointerDown(e: React.PointerEvent<HTMLDivElement>, pinId: string) {
    e.stopPropagation(); // Don't bubble to container (would create a new pin)
    if (e.button !== 0) return;
    setSelectedPinId(pinId);
    setDraggingPinId(pinId);
    // Capture on the container so move/up are handled there
    imageContainerRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePinClick(e: React.MouseEvent, pinId: string) {
    e.stopPropagation();
    setSelectedPinId(prev => prev === pinId ? null : pinId);
  }

  // --- Carousel navigation ---
  function goToPrevious() {
    setCurrentIndex(prev => (prev === 0 ? localImages.length - 1 : prev - 1));
    setSelectedPinId(null);
    setDraggingPinId(null);
  }

  function goToNext() {
    setCurrentIndex(prev => (prev === localImages.length - 1 ? 0 : prev + 1));
    setSelectedPinId(null);
    setDraggingPinId(null);
  }

  return (
    <div className="space-y-4">
      {/* Main image with pin overlay */}
      <div
        ref={imageContainerRef}
        className="relative w-full bg-muted rounded-lg overflow-hidden select-none"
        style={{ cursor: draggingPinId ? 'grabbing' : showPins ? 'crosshair' : 'default' }}
        onPointerDown={showPins ? handleContainerPointerDown : undefined}
        onPointerMove={showPins ? handleContainerPointerMove : undefined}
        onPointerUp={showPins ? handleContainerPointerUp : undefined}
      >
        <img
          src={currentImage.base64}
          alt={currentImage.caption || `Image ${currentIndex + 1}`}
          className="w-full max-h-96 object-contain pointer-events-none"
          draggable={false}
        />

        {/* Pins overlay */}
        {showPins && currentPins.map(pin => {
          const linkedTask = tasks.find(t => t.pinRef?.pinId === pin.id);
          const isSelected = pin.id === selectedPinId;
          return (
            <div
              key={pin.id}
              style={{
                position: 'absolute',
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                transform: 'translate(-50%, -50%)',
                cursor: draggingPinId === pin.id ? 'grabbing' : 'grab',
              }}
              onPointerDown={(e) => handlePinPointerDown(e, pin.id)}
              onClick={(e) => handlePinClick(e, pin.id)}
              title={linkedTask ? `Pin #${pin.number} — ${linkedTask.name}` : `Pin #${pin.number}`}
              className={`
                w-7 h-7 rounded-full flex items-center justify-center
                text-xs font-bold shadow-md z-10
                transition-colors
                ${isSelected
                  ? 'bg-destructive text-destructive-foreground ring-2 ring-white'
                  : 'bg-primary text-primary-foreground hover:bg-primary/80'
                }
              `}
            >
              {pin.number}
            </div>
          );
        })}

        {/* Carousel prev/next */}
        {localImages.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full shadow-lg"
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full shadow-lg"
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Counter */}
        {localImages.length > 1 && (
          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none">
            {currentIndex + 1} / {localImages.length}
          </div>
        )}

        {/* Eye toggle */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 rounded-full shadow opacity-80 hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); setShowPins(v => !v); setSelectedPinId(null); }}
          title={showPins ? 'Masquer les pins' : 'Afficher les pins'}
        >
          {showPins ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>

        {/* Pin count hint */}
        {showPins && currentPins.length === 0 && (
          <div className="absolute bottom-2 right-2 text-xs text-white/70 pointer-events-none bg-black/30 px-2 py-1 rounded">
            Cliquer pour ajouter un pin
          </div>
        )}
        {showPins && selectedPinId && (
          <div className="absolute bottom-2 right-2 text-xs text-white/70 pointer-events-none bg-black/30 px-2 py-1 rounded">
            Suppr. pour effacer
          </div>
        )}
      </div>

      {/* Caption */}
      {currentImage.caption && (
        <p className="text-sm text-center text-muted-foreground italic">
          {currentImage.caption}
        </p>
      )}

      {/* Thumbnails */}
      {localImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {localImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => { setCurrentIndex(index); setSelectedPinId(null); }}
              className={`relative flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden ${
                index === currentIndex
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <img
                src={image.base64}
                alt={image.caption || `Miniature ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {image.isPrimary && (
                <div className="absolute top-0 left-0 bg-primary text-primary-foreground text-[10px] px-1">
                  ★
                </div>
              )}
              {image.pins && image.pins.length > 0 && (
                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl">
                  {image.pins.length} 📍
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
