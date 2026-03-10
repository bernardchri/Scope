'use client';

import { useState, useRef, useEffect } from 'react';
import { ComponentImage, ImagePin, Task, CropRect } from '@/lib/types';
import { usePinEditor } from '@/lib/hooks/usePinEditor';
import { open } from '@tauri-apps/plugin-dialog';
import { saveImageFromPath, deleteImage } from '@/lib/imageManager';
import { useImageLoader } from '@/lib/hooks/useImageLoader';
import PinsOverlay from '@/components/molecules/PinsOverlay';
import CropOverlay from '@/components/molecules/CropOverlay';
import SortableThumbnail from '@/components/molecules/SortableThumbnail';
import ZoomModal from '@/components/modals/ZoomModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Crop, Eye, EyeOff, Maximize2, Plus, Upload } from 'lucide-react';
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
  folderPath: string;
  onUpdateImages: (images: ComponentImage[]) => void;
}

/** CSS inline styles for displaying a cropped image */
function cropStyles(crop: CropRect) {
  return {
    width: `${100 / (crop.width / 100)}%`,
    maxWidth: 'none' as const,
    marginLeft: `${-(crop.x / crop.width) * 100}%`,
    marginTop: `${-(crop.y / crop.height) * 100}%`,
  };
}

export default function ImagePinViewer({ images, tasks, folderPath, onUpdateImages }: ImagePinViewerProps) {
  const thumbnailSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const { resolve: resolveImageSrc } = useImageLoader(images, folderPath);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPins, setShowPins] = useState(true);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [localImages, setLocalImages] = useState(images);
  const [imageError, setImageError] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [isCropping, setIsCropping] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalImages(images); }, [images]);

  // Clamp index si images change
  useEffect(() => {
    if (currentIndex >= localImages.length && localImages.length > 0) {
      setCurrentIndex(localImages.length - 1);
    }
  }, [localImages.length, currentIndex]);

  const currentImage = localImages[currentIndex] as ComponentImage | undefined;
  const currentCrop = currentImage?.crop;

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
  } = usePinEditor({ imageContainerRef, localImages, setLocalImages, currentIndex, onUpdateImages, crop: currentCrop });

  // ── Image management ────────────────────────────────────────────────

  async function handleAddImage() {
    setImageError(null);
    try {
      const filePath = await open({
        multiple: false,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
      });
      if (!filePath || typeof filePath !== 'string') return;

      const filename = await saveImageFromPath(folderPath, filePath);
      const newImage: ComponentImage = {
        id: crypto.randomUUID(),
        filename,
        caption: '',
        isPrimary: localImages.length === 0,
      };
      const updated = [...localImages, newImage];
      setLocalImages(updated);
      setCurrentIndex(updated.length - 1);
      onUpdateImages(updated);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  function handleRemoveImage(imageId: string) {
    const removed = localImages.find(img => img.id === imageId);
    const newImages = localImages.filter(img => img.id !== imageId);
    if (newImages.length > 0 && !newImages.some(img => img.isPrimary)) {
      newImages[0].isPrimary = true;
    }
    setLocalImages(newImages);
    onUpdateImages(newImages);
    // Delete file from disk
    if (removed?.filename) {
      deleteImage(folderPath, removed.filename).catch(console.error);
    }
  }

  function handleSaveCaption() {
    if (!localImages[currentIndex]) return;
    const updated = localImages.map((img, i) =>
      i === currentIndex ? { ...img, caption: captionDraft } : img
    );
    setLocalImages(updated);
    onUpdateImages(updated);
    setEditingCaption(false);
  }

  function handleApplyCrop(crop: CropRect) {
    const updated = localImages.map((img, i) =>
      i === currentIndex ? { ...img, crop } : img
    );
    setLocalImages(updated);
    onUpdateImages(updated);
    setIsCropping(false);
  }

  function handleResetCrop() {
    const updated = localImages.map((img, i) =>
      i === currentIndex ? { ...img, crop: undefined } : img
    );
    setLocalImages(updated);
    onUpdateImages(updated);
    setIsCropping(false);
  }

  // ── Empty state ─────────────────────────────────────────────────────

  if (!localImages || localImages.length === 0) {
    return (
      <div className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <p className="text-muted-foreground mb-3">Aucune maquette</p>
        <Button type="button" variant="outline" size="sm" onClick={handleAddImage}>
          <Upload className="h-4 w-4 mr-2" />
          Ajouter une image
        </Button>
        {imageError && <p className="text-destructive text-sm mt-2">{imageError}</p>}
        <p className="text-xs text-muted-foreground mt-2">Redimensionnement auto si &gt; 2048px</p>
      </div>
    );
  }

  if (!currentImage) return null;
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
    setIsCropping(false);
  }

  function goToNext() {
    setCurrentIndex(prev => (prev === localImages.length - 1 ? 0 : prev + 1));
    clearSelection();
    setIsCropping(false);
  }

  const imgSrc = resolveImageSrc(currentImage);

  return (
    <div className="space-y-4">
      {/* ── Image principale avec overlay pins ─────────────────────────────── */}
      <div className="relative w-full bg-muted rounded-lg select-none p-5">
        <div className="flex flex-col justify-center items-center">
          <div
            ref={imageContainerRef}
            className="relative max-w-[840px]"
            style={{
              cursor: isCropping ? 'default' : draggingPinId ? 'grabbing' : showPins ? 'crosshair' : 'default',
              ...(currentCrop && !isCropping ? { overflow: 'hidden' } : {}),
            }}
            onPointerDown={showPins && !isCropping ? handleContainerPointerDown : undefined}
            onPointerMove={showPins && !isCropping ? handleContainerPointerMove : undefined}
            onPointerUp={showPins && !isCropping ? handleContainerPointerUp : undefined}
          >
            {imgSrc && (
              <img
                src={imgSrc}
                alt={currentImage.caption || `Image ${currentIndex + 1}`}
                className={`block pointer-events-none ${!currentCrop || isCropping ? 'w-full' : ''}`}
                style={currentCrop && !isCropping ? cropStyles(currentCrop) : undefined}
                draggable={false}
              />
            )}
            {showPins && !isCropping && (
              <PinsOverlay
                pins={currentPins}
                tasks={tasks}
                selectedPinId={selectedPinId}
                draggingPinId={draggingPinId}
                crop={currentCrop}
                onPinPointerDown={handlePinPointerDown}
                onPinClick={handlePinClick}
              />
            )}
            {isCropping && (
              <CropOverlay
                initialCrop={currentCrop}
                onApply={handleApplyCrop}
                onReset={handleResetCrop}
                onCancel={() => setIsCropping(false)}
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

          {/* Controles haut-droit */}
          <div className="absolute top-2 right-2 flex gap-1">
            <Button variant="secondary" size="icon" className="rounded-full shadow opacity-80 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); handleAddImage(); }} title="Ajouter une image">
              <Upload className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full shadow opacity-80 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); setIsCropping(v => !v); clearSelection(); }}
              title={isCropping ? 'Annuler le recadrage' : 'Recadrer l\'image'}>
              <Crop className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full shadow opacity-80 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); setZoomOpen(true); }} title="Ouvrir en plein ecran">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full shadow opacity-80 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); setShowPins(v => !v); clearSelection(); }}
              title={showPins ? 'Masquer les pins' : 'Afficher les pins'}>
              {showPins ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>

          {/* Hint */}
          {showPins && !isCropping && (currentPins.length === 0 || selectedPinId) && (
            <div className="absolute bottom-2 right-2 text-xs text-white/70 pointer-events-none bg-black/30 px-2 py-1 rounded">
              {selectedPinId ? 'Suppr. pour effacer' : 'Cliquer pour ajouter un pin'}
            </div>
          )}


          {/* Caption (editable inline) */}
          <div className="text-center my-4">
            {editingCaption ? (
              <div className="flex items-center gap-2 justify-center max-w-md mx-auto">
                <Input
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  placeholder="Legende (optionnelle)"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveCaption();
                    if (e.key === 'Escape') setEditingCaption(false);
                  }}
                />
                <Button size="sm" onClick={handleSaveCaption}>OK</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingCaption(false)}>Annuler</Button>
              </div>
            ) : (
              <button
                className="text-sm text-muted-foreground italic hover:text-foreground transition-colors"
                onClick={() => { setCaptionDraft(currentImage.caption || ''); setEditingCaption(true); }}
                title="Cliquer pour modifier la legende"
              >
                {currentImage.caption || 'Ajouter une legende...'}
              </button>
            )}
          </div>
        </div>
      </div>

      {imageError && <p className="text-destructive text-sm">{imageError}</p>}


      {/* Thumbnails avec drag & drop */}
      {localImages.length >= 1 && (
        <DndContext sensors={thumbnailSensors} collisionDetection={closestCenter} onDragEnd={handleThumbnailDragEnd}>
          <SortableContext items={localImages.map(img => img.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-2 overflow-x-auto py-2 z-">
              {localImages.map((image, index) => (
                <SortableThumbnail
                  key={image.id}
                  image={image}
                  index={index}
                  isActive={index === currentIndex}
                  src={resolveImageSrc(image)}
                  onClick={() => { setCurrentIndex(index); clearSelection(); setIsCropping(false); }}
                  onDelete={() => handleRemoveImage(image.id)}
                />
              ))}
              <button
                type="button"
                onClick={handleAddImage}
                className="w-20 h-20 flex-shrink-0 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                title="Ajouter une image"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modal zoom */}
      <ZoomModal
        open={zoomOpen}
        image={localImages[currentIndex]}
        tasks={tasks}
        folderPath={folderPath}
        onUpdatePins={(pins: ImagePin[]) => updatePins(pins, true)}
        onClose={() => setZoomOpen(false)}
      />

    </div>
  );
}
