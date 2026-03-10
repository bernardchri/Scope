'use client';

import { useState, useRef, useEffect } from 'react';
import { ComponentImage, ImagePin, Task } from '@/lib/types';
import { useImageLoader } from '@/lib/hooks/useImageLoader';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, ZoomIn, ZoomOut, X } from 'lucide-react';
import PinsOverlay from '@/components/molecules/PinsOverlay';

interface ZoomModalProps {
  open: boolean;
  image: ComponentImage;
  tasks: Task[];
  folderPath: string;
  onUpdatePins: (pins: ImagePin[]) => void;
  onClose: () => void;
}

export default function ZoomModal({ open, image, tasks, folderPath, onUpdatePins, onClose }: ZoomModalProps) {
  const { resolve: resolveImageSrc } = useImageLoader([image], folderPath);
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

  // Sync pins quand l'image change (changement de slide depuis l'extérieur)
  useEffect(() => {
    const pins = image.pins ?? [];
    localPinsRef.current = pins;
    setLocalPins(pins);
  }, [image.id]);

  function savePins(pins: ImagePin[]) {
    localPinsRef.current = pins;
    setLocalPins(pins);
  }

  // ── Wheel zoom centré sur le curseur ──────────────────────────────────────
  useEffect(() => {
    if (!open) return;
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
      const cursorX = e.clientX - rect.left + container.scrollLeft;
      const cursorY = e.clientY - rect.top + container.scrollTop;
      const factor = newZoom / currentZoom;

      zoomRef.current = newZoom;
      setZoom(newZoom);

      requestAnimationFrame(() => {
        container.scrollLeft = Math.max(0, cursorX * factor - (e.clientX - rect.left));
        container.scrollTop  = Math.max(0, cursorY * factor - (e.clientY - rect.top));
      });
    }

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [open]);

  // ── Suppression par clavier ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' || !selectedPinId) return;
      const updated = localPinsRef.current.filter(p => p.id !== selectedPinId);
      savePins(updated);
      setSelectedPinId(null);
      onUpdatePins(updated);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, selectedPinId, onUpdatePins]);

  function getNextPinNumber() {
    const pins = localPinsRef.current;
    if (pins.length === 0) return 1;
    return Math.max(...pins.map(p => p.number)) + 1;
  }

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

    const newPin: ImagePin = { id: crypto.randomUUID(), number: getNextPinNumber(), ...coords };
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
    savePins(localPinsRef.current.map(p => p.id === draggingPinId ? { ...p, ...coords } : p));
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      {/* [&>button]:hidden supprime le bouton X par défaut de shadcn DialogContent */}
      <DialogContent className="max-w-[95vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden [&>button]:hidden">

        {/* ── Barre d'outils ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-background shrink-0">
          <DialogTitle className="text-sm text-muted-foreground truncate max-w-xs font-normal">
            {image.caption || 'Image'}
          </DialogTitle>
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

        {/* ── Zone scrollable & zoomable ───────────────────────────────────── */}
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
            <img
              src={resolveImageSrc(image)}
              alt={image.caption || 'Image'}
              className="w-full block pointer-events-none"
              draggable={false}
            />
            {showPins && (
              <PinsOverlay
                pins={localPins}
                tasks={tasks}
                selectedPinId={selectedPinId}
                draggingPinId={draggingPinId}
                zoom={zoom}
                onPinPointerDown={handlePinPointerDown}
                onPinClick={handlePinClick}
              />
            )}
          </div>
        </div>

        {/* ── Barre d'aide ─────────────────────────────────────────────────── */}
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
    </Dialog>
  );
}
