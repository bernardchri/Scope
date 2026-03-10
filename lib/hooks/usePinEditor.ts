'use client';

import { useState, useEffect } from 'react';
import { ComponentImage, ImagePin, CropRect } from '@/lib/types';
import { pinToFullSpace } from '@/lib/imageHelpers';

interface UsePinEditorParams {
  imageContainerRef: React.RefObject<HTMLDivElement | null>;
  localImages: ComponentImage[];
  setLocalImages: React.Dispatch<React.SetStateAction<ComponentImage[]>>;
  currentIndex: number;
  onUpdateImages: (images: ComponentImage[]) => void;
  crop?: CropRect;
}

export function usePinEditor({
  imageContainerRef,
  localImages,
  setLocalImages,
  currentIndex,
  onUpdateImages,
  crop,
}: UsePinEditorParams) {
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);

  const currentPins = localImages[currentIndex]?.pins ?? [];

  // Suppression par clavier
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' || !selectedPinId) return;
      const updated = localImages.map((img, i) =>
        i === currentIndex
          ? { ...img, pins: (img.pins ?? []).filter(p => p.id !== selectedPinId) }
          : img
      );
      setLocalImages(updated);
      setSelectedPinId(null);
      onUpdateImages(updated);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPinId, localImages, currentIndex, onUpdateImages, setLocalImages]);

  function getCoords(clientX: number, clientY: number) {
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const containerCoords = {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
    // If crop is active, map container coords (which are in cropped space) to full-image space
    return crop ? pinToFullSpace(containerCoords, crop) : containerCoords;
  }

  function updatePins(pins: ImagePin[], save = false) {
    const updated = localImages.map((img, i) =>
      i === currentIndex ? { ...img, pins } : img
    );
    setLocalImages(updated);
    if (save) onUpdateImages(updated);
  }

  function handleContainerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !imageContainerRef.current) return;
    if ((e.target as HTMLElement).closest('button')) return;
    const coords = getCoords(e.clientX, e.clientY);
    if (!coords) return;
    const nextNumber = currentPins.length === 0 ? 1 : Math.max(...currentPins.map(p => p.number)) + 1;
    const newPin: ImagePin = { id: crypto.randomUUID(), number: nextNumber, ...coords };
    updatePins([...currentPins, newPin]);
    setSelectedPinId(newPin.id);
    setDraggingPinId(newPin.id);
    imageContainerRef.current.setPointerCapture(e.pointerId);
  }

  function handleContainerPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingPinId) return;
    const coords = getCoords(e.clientX, e.clientY);
    if (!coords) return;
    updatePins(currentPins.map(p => p.id === draggingPinId ? { ...p, ...coords } : p));
  }

  function handleContainerPointerUp() {
    if (!draggingPinId) return;
    setDraggingPinId(null);
    onUpdateImages(localImages);
  }

  function handlePinPointerDown(e: React.PointerEvent, pinId: string) {
    e.stopPropagation();
    if (e.button !== 0) return;
    setSelectedPinId(pinId);
    setDraggingPinId(pinId);
    imageContainerRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePinClick(e: React.MouseEvent, pinId: string) {
    e.stopPropagation();
    setSelectedPinId(prev => prev === pinId ? null : pinId);
  }

  function clearSelection() {
    setSelectedPinId(null);
    setDraggingPinId(null);
  }

  return {
    selectedPinId,
    draggingPinId,
    updatePins,
    clearSelection,
    handleContainerPointerDown,
    handleContainerPointerMove,
    handleContainerPointerUp,
    handlePinPointerDown,
    handlePinClick,
  };
}
