'use client';

import { useState, useRef, useEffect } from 'react';
import { ComponentImage, ImagePin, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Maximize2, ZoomIn, ZoomOut, X } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Thumbnail sortable ───────────────────────────────────────────────────────

interface SortableThumbnailProps {
  image: ComponentImage;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

function SortableThumbnail({ image, index, isActive, onClick }: SortableThumbnailProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        flexShrink: 0,
      }}
      {...attributes}
      {...listeners}
    >
      <button
        onClick={onClick}
        className={`relative w-20 h-20 rounded border-2 overflow-hidden cursor-grab active:cursor-grabbing ${
          isActive
            ? 'border-primary ring-2 ring-primary/30'
            : 'border-border hover:border-muted-foreground'
        }`}
      >
        <img
          src={image.base64}
          alt={image.caption || `Miniature ${index + 1}`}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
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
    </div>
  );
}

// ─── Zoom Modal ───────────────────────────────────────────────────────────────

interface ZoomModalProps {
  image: ComponentImage;
  tasks: Task[];
  onUpdatePins: (pins: ImagePin[]) => void;
  onClose: () => void;
}

function ZoomModal({ image, tasks, onUpdatePins, onClose }: ZoomModalProps) {
  const [zoom, setZoom] = useState(1);
  const [showPins, setShowPins] = useState(true);
  const [localPins, setLocalPins] = useState<ImagePin[]>(image.pins ?? []);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  // Refs pour éviter les stale closures dans les handlers non-React
  const zoomRef = useRef(1);
  const localPinsRef = useRef<ImagePin[]>(image.pins ?? []);

  function savePins(pins: ImagePin[]) {
    localPinsRef.current = pins;
    setLocalPins(pins);
  }

  // ── Wheel zoom centré sur le curseur ──────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onWheel(e: WheelEvent) {
      if (!container) return;
      e.preventDefault();
      const currentZoom = zoomRef.current;
      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      const newZoom = Math.max(1, Math.min(5, currentZoom + delta));
      if (newZoom === currentZoom) return;

      const rect = container.getBoundingClientRect();
      // Position du curseur dans le contenu scrollé
      const cursorX = e.clientX - rect.left + container.scrollLeft;
      const cursorY = e.clientY - rect.top + container.scrollTop;
      const factor = newZoom / currentZoom;

      zoomRef.current = newZoom;
      setZoom(newZoom);

      // Après le rendu (la div inner s'est agrandie), repositionner le scroll
      requestAnimationFrame(() => {
        container.scrollLeft = Math.max(0, cursorX * factor - (e.clientX - rect.left));
        container.scrollTop  = Math.max(0, cursorY * factor - (e.clientY - rect.top));
      });
    }

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // ── Suppression par clavier ───────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' || !selectedPinId) return;
      const updated = localPinsRef.current.filter(p => p.id !== selectedPinId);
      savePins(updated);
      setSelectedPinId(null);
      onUpdatePins(updated);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedPinId, onUpdatePins]);

  function getNextPinNumber() {
    const pins = localPinsRef.current;
    if (pins.length === 0) return 1;
    return Math.max(...pins.map(p => p.number)) + 1;
  }

  // Convertit une position écran → coordonnées % dans l'image (inner div)
  function getInnerCoords(clientX: number, clientY: number) {
    const inner = innerRef.current;
    if (!inner) return null;
    const rect = inner.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100)),
      y: Math.max(0, Math.min(100, (clientY - rect.top) / rect.height * 100)),
    };
  }

  function handleInnerPointerDown(e: React.PointerEvent) {
    if (e.button !== 0 || !showPins) return;
    if ((e.target as HTMLElement).closest('[data-pin]')) return;

    const coords = getInnerCoords(e.clientX, e.clientY);
    if (!coords) return;

    const newPin: ImagePin = {
      id: crypto.randomUUID(),
      number: getNextPinNumber(),
      ...coords,
    };
    const newPins = [...localPinsRef.current, newPin];
    savePins(newPins);
    setSelectedPinId(newPin.id);
    setDraggingPinId(newPin.id);
    innerRef.current?.setPointerCapture(e.pointerId);
  }

  function handleInnerPointerMove(e: React.PointerEvent) {
    if (!draggingPinId) return;
    const coords = getInnerCoords(e.clientX, e.clientY);
    if (!coords) return;
    savePins(localPinsRef.current.map(p =>
      p.id === draggingPinId ? { ...p, ...coords } : p
    ));
  }

  function handleInnerPointerUp() {
    if (!draggingPinId) return;
    setDraggingPinId(null);
    onUpdatePins(localPinsRef.current);
  }

  function handlePinPointerDown(e: React.PointerEvent, pinId: string) {
    e.stopPropagation();
    if (e.button !== 0) return;
    setSelectedPinId(pinId);
    setDraggingPinId(pinId);
    innerRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePinClick(e: React.MouseEvent, pinId: string) {
    e.stopPropagation();
    setSelectedPinId(prev => prev === pinId ? null : pinId);
  }

  function applyZoom(newZoom: number) {
    zoomRef.current = newZoom;
    setZoom(newZoom);
  }

  return (
    // [&>button]:hidden supprime le bouton X par défaut de shadcn DialogContent
    <DialogContent className="max-w-[95vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden [&>button]:hidden">

      {/* ── Barre d'outils ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-background shrink-0">
        <span className="text-sm text-muted-foreground truncate max-w-xs">
          {image.caption || 'Image'}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => applyZoom(Math.max(1, zoom - 0.5))}
            title="Dézoomer"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs w-10 text-center tabular-nums text-muted-foreground select-none">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => applyZoom(Math.min(5, zoom + 0.5))}
            title="Zoomer"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => { setShowPins(v => !v); setSelectedPinId(null); }}
            title={showPins ? 'Masquer les pins' : 'Afficher les pins'}
          >
            {showPins ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Fermer">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Zone scrollable & zoomable ─────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/40"
        style={{ cursor: !showPins ? 'default' : draggingPinId ? 'grabbing' : 'crosshair' }}
      >
        <div
          ref={innerRef}
          className="relative select-none"
          style={{ width: `${zoom * 100}%` }}
          onPointerDown={showPins ? handleInnerPointerDown : undefined}
          onPointerMove={handleInnerPointerMove}
          onPointerUp={handleInnerPointerUp}
        >
          {/* Image sans object-contain → coordonnées % = % de l'image réelle */}
          <img
            src={image.base64}
            alt={image.caption || 'Image'}
            className="w-full block pointer-events-none"
            draggable={false}
          />

          {/* Overlay des pins */}
          {showPins && localPins.map(pin => {
            const linkedTask = tasks.find(t => t.pinRef?.pinId === pin.id);
            const isSelected = pin.id === selectedPinId;
            return (
              <div
                key={pin.id}
                data-pin
                style={{
                  position: 'absolute',
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  // Inverser le zoom pour que le badge reste à taille fixe
                  transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                  cursor: draggingPinId === pin.id ? 'grabbing' : 'grab',
                  zIndex: 10,
                }}
                onPointerDown={(e) => handlePinPointerDown(e, pin.id)}
                onClick={(e) => handlePinClick(e, pin.id)}
                title={linkedTask ? `Pin #${pin.number} — ${linkedTask.name}` : `Pin #${pin.number}`}
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center
                  text-xs font-bold shadow-md transition-colors
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
        </div>
      </div>

      {/* ── Barre d'aide ───────────────────────────────────────────────────── */}
      <div className="px-3 py-1.5 border-t bg-background shrink-0 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {showPins
            ? selectedPinId
              ? 'Suppr. pour effacer · Clic pour désélectionner'
              : 'Clic pour ajouter un pin · Molette pour zoomer'
            : 'Molette pour zoomer · Mode navigation'
          }
        </span>
        <span className="text-xs text-muted-foreground">
          {localPins.length} pin{localPins.length !== 1 ? 's' : ''}
        </span>
      </div>
    </DialogContent>
  );
}

// ─── ImagePinViewer principal ─────────────────────────────────────────────────

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
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
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

  // Delete selected pin on keyboard Delete (main view)
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

  // --- Pointer events on the image container (main view) ---

  function handleContainerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if (!imageContainerRef.current) return;
    if ((e.target as HTMLElement).closest('button')) return;

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
    updateCurrentImagePins(updatedPins, false);
  }

  function handleContainerPointerUp() {
    if (!draggingPinId) return;
    setDraggingPinId(null);
    const updated = localImages.map((img, i) =>
      i === currentIndex ? { ...img, pins: localImages[currentIndex].pins } : img
    );
    onUpdateImages(updated);
  }

  function handlePinPointerDown(e: React.PointerEvent<HTMLDivElement>, pinId: string) {
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

  // --- Thumbnail reorder ---
  function handleThumbnailDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localImages.findIndex(img => img.id === active.id);
    const newIndex = localImages.findIndex(img => img.id === over.id);
    const reordered = arrayMove(localImages, oldIndex, newIndex);
    const activeImageId = localImages[currentIndex]?.id;
    setLocalImages(reordered);
    if (activeImageId) {
      setCurrentIndex(reordered.findIndex(img => img.id === activeImageId));
    }
    onUpdateImages(reordered);
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

  // --- Zoom modal ---
  function handleZoomPinsUpdate(pins: ImagePin[]) {
    updateCurrentImagePins(pins, true);
  }

  return (
    <div className="space-y-4">
      {/* ── Image principale avec overlay pins ─────────────────────────────── */}
      {/*
        Outer : limite visuelle à 384px et sert de référence pour les contrôles
                en position absolue (carousel, boutons, hints).
        Inner : taille naturelle de l'image (w-full block, pas d'object-contain)
                → coordonnées % identiques à la modal zoom → pas de décalage.
      */}
      <div className="relative w-full max-h-96 overflow-hidden bg-muted rounded-lg select-none">
        {/* Inner — système de coordonnées des pins */}
        <div
          ref={imageContainerRef}
          className="relative w-full"
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

          {/* Pins overlay — % de l'image réelle, aligné avec la modal zoom */}
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
        </div>

        {/* Contrôles absolus — positionnés dans la zone visible (outer max-h-96) */}

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

        {/* Contrôles coin haut-droit */}
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full shadow opacity-80 hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); setZoomOpen(true); }}
            title="Ouvrir en plein écran"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full shadow opacity-80 hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); setShowPins(v => !v); setSelectedPinId(null); }}
            title={showPins ? 'Masquer les pins' : 'Afficher les pins'}
          >
            {showPins ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>

        {/* Hints */}
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

      {/* Thumbnails avec drag & drop */}
      {localImages.length > 1 && (
        <DndContext
          sensors={thumbnailSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleThumbnailDragEnd}
        >
          <SortableContext
            items={localImages.map(img => img.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-2 overflow-x-auto pb-2">
              {localImages.map((image, index) => (
                <SortableThumbnail
                  key={image.id}
                  image={image}
                  index={index}
                  isActive={index === currentIndex}
                  onClick={() => { setCurrentIndex(index); setSelectedPinId(null); }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* ── Modal zoom ─────────────────────────────────────────────────────── */}
      <Dialog open={zoomOpen} onOpenChange={(open) => !open && setZoomOpen(false)}>
        {zoomOpen && (
          <ZoomModal
            image={localImages[currentIndex]}
            tasks={tasks}
            onUpdatePins={handleZoomPinsUpdate}
            onClose={() => setZoomOpen(false)}
          />
        )}
      </Dialog>
    </div>
  );
}
