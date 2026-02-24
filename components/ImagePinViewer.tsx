'use client';

import { useState, useRef, useEffect } from 'react';
import { ComponentImage, ImagePin, Task } from '@/lib/types';
import { usePinEditor } from '@/lib/hooks/usePinEditor';
import PinsOverlay from '@/components/molecules/PinsOverlay';
import SortableThumbnail from '@/components/molecules/SortableThumbnail';
import ZoomModal from '@/components/modals/ZoomModal';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Maximize2 } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';

interface ImagePinViewerProps {
  images: ComponentImage[];
  tasks: Task[];
  onUpdateImages: (images: ComponentImage[]) => void;
}

export default function ImagePinViewer({ images, tasks, onUpdateImages }: ImagePinViewerProps) {
  const thumbnailSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPins, setShowPins] = useState(true);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [localImages, setLocalImages] = useState(images);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalImages(images); }, [images]);

  // Clamp index si images change
  useEffect(() => {
    if (currentIndex >= localImages.length && localImages.length > 0) {
      setCurrentIndex(localImages.length - 1);
    }
  }, [localImages.length, currentIndex]);

  const {
    selectedPinId,
    draggingPinId,
    updatePins,
    clearSelection,
    handleContainerPointerDown,
    handleContainerPointerMove,
    handleContainerPointerUp,
    handlePinPointerDown,
    handlePinClick,
  } = usePinEditor({ imageContainerRef, localImages, setLocalImages, currentIndex, onUpdateImages });

  if (!localImages || localImages.length === 0) {
    return (
      <div className="w-full bg-muted rounded-lg p-5 text-center text-muted-foreground">
        Aucune image
      </div>
    );
  }

  const currentImage = localImages[currentIndex];
  const currentPins = currentImage.pins ?? [];

  function handleThumbnailDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localImages.findIndex(img => img.id === active.id);
    const newIndex = localImages.findIndex(img => img.id === over.id);
    const reordered = arrayMove(localImages, oldIndex, newIndex);
    const activeImageId = localImages[currentIndex]?.id;
    setLocalImages(reordered);
    if (activeImageId) setCurrentIndex(reordered.findIndex(img => img.id === activeImageId));
    onUpdateImages(reordered);
  }

  function goToPrevious() {
    setCurrentIndex(prev => (prev === 0 ? localImages.length - 1 : prev - 1));
    clearSelection();
  }

  function goToNext() {
    setCurrentIndex(prev => (prev === localImages.length - 1 ? 0 : prev + 1));
    clearSelection();
  }

  return (
    <div className="space-y-4">
      {/* ── Image principale avec overlay pins ─────────────────────────────── */}
      <div className="relative w-full bg-muted rounded-lg select-none p-5">
        <div className="flex flex-col justify-center items-center">
          <div
            ref={imageContainerRef}
            className="relative max-w-[840px]"
            style={{ cursor: draggingPinId ? 'grabbing' : showPins ? 'crosshair' : 'default' }}
            onPointerDown={showPins ? handleContainerPointerDown : undefined}
            onPointerMove={showPins ? handleContainerPointerMove : undefined}
            onPointerUp={showPins ? handleContainerPointerUp : undefined}
          >
            <img
              src={currentImage.base64}
              alt={currentImage.caption || `Image ${currentIndex + 1}`}
              className="w-full block pointer-events-none"
              draggable={false}
            />
            {showPins && (
              <PinsOverlay
                pins={currentPins}
                tasks={tasks}
                selectedPinId={selectedPinId}
                draggingPinId={draggingPinId}
                onPinPointerDown={handlePinPointerDown}
                onPinClick={handlePinClick}
              />
            )}
          </div>

          {/* Carousel prev/next */}
          {localImages.length > 1 && (
            <>
              <Button variant="secondary" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full shadow-lg"
                onClick={(e) => { e.stopPropagation(); goToPrevious(); }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full shadow-lg"
                onClick={(e) => { e.stopPropagation(); goToNext(); }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none">
                {currentIndex + 1} / {localImages.length}
              </div>
            </>
          )}

          {/* Contrôles haut-droit */}
          <div className="absolute top-2 right-2 flex gap-1">
            <Button variant="secondary" size="icon" className="rounded-full shadow opacity-80 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); setZoomOpen(true); }} title="Ouvrir en plein écran">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full shadow opacity-80 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); setShowPins(v => !v); clearSelection(); }}
              title={showPins ? 'Masquer les pins' : 'Afficher les pins'}>
              {showPins ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>

          {/* Hint */}
          {showPins && (currentPins.length === 0 || selectedPinId) && (
            <div className="absolute bottom-2 right-2 text-xs text-white/70 pointer-events-none bg-black/30 px-2 py-1 rounded">
              {selectedPinId ? 'Suppr. pour effacer' : 'Cliquer pour ajouter un pin'}
            </div>
          )}
        </div>
      </div>

      {/* Caption */}
      {currentImage.caption && (
        <p className="text-sm text-center text-muted-foreground italic">{currentImage.caption}</p>
      )}

      {/* Thumbnails avec drag & drop */}
      {localImages.length > 1 && (
        <DndContext sensors={thumbnailSensors} collisionDetection={closestCenter} onDragEnd={handleThumbnailDragEnd}>
          <SortableContext items={localImages.map(img => img.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {localImages.map((image, index) => (
                <SortableThumbnail
                  key={image.id}
                  image={image}
                  index={index}
                  isActive={index === currentIndex}
                  onClick={() => { setCurrentIndex(index); clearSelection(); }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modal zoom */}
      <ZoomModal
        open={zoomOpen}
        image={localImages[currentIndex]}
        tasks={tasks}
        onUpdatePins={(pins: ImagePin[]) => updatePins(pins, true)}
        onClose={() => setZoomOpen(false)}
      />
    </div>
  );
}
