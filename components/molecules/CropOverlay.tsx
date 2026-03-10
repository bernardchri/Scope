'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { CropRect } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Check, X, RotateCcw } from 'lucide-react';

interface CropOverlayProps {
  initialCrop?: CropRect;
  onApply: (crop: CropRect) => void;
  onReset: () => void;
  onCancel: () => void;
}

type HandleType = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | 'move';

const HANDLE_CURSORS: Record<HandleType, string> = {
  nw: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', se: 'nwse-resize',
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
  move: 'move',
};

const MIN_SIZE = 5; // minimum crop size in %

export default function CropOverlay({ initialCrop, onApply, onReset, onCancel }: CropOverlayProps) {
  const [crop, setCrop] = useState<CropRect>(initialCrop ?? { x: 10, y: 10, width: 80, height: 80 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ type: HandleType; startX: number; startY: number; startCrop: CropRect } | null>(null);

  const getPercent = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { px: 0, py: 0 };
    return {
      px: ((clientX - rect.left) / rect.width) * 100,
      py: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, type: HandleType) => {
    e.preventDefault();
    e.stopPropagation();
    const { px, py } = getPercent(e.clientX, e.clientY);
    dragRef.current = { type, startX: px, startY: py, startCrop: { ...crop } };
    containerRef.current?.setPointerCapture(e.pointerId);
  }, [crop, getPercent]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { type, startX, startY, startCrop } = dragRef.current;
    const { px, py } = getPercent(e.clientX, e.clientY);
    const dx = px - startX;
    const dy = py - startY;

    let { x, y, width, height } = startCrop;

    if (type === 'move') {
      x = Math.max(0, Math.min(100 - width, x + dx));
      y = Math.max(0, Math.min(100 - height, y + dy));
    } else {
      // Resize based on handle
      if (type.includes('w')) {
        const newX = Math.max(0, Math.min(x + width - MIN_SIZE, x + dx));
        width = width + (x - newX);
        x = newX;
      }
      if (type.includes('e')) {
        width = Math.max(MIN_SIZE, Math.min(100 - x, width + dx));
      }
      if (type.includes('n')) {
        const newY = Math.max(0, Math.min(y + height - MIN_SIZE, y + dy));
        height = height + (y - newY);
        y = newY;
      }
      if (type.includes('s')) {
        height = Math.max(MIN_SIZE, Math.min(100 - y, height + dy));
      }
    }

    setCrop({ x, y, width, height });
  }, [getPercent]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Escape to cancel
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onApply(crop);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, onApply, crop]);

  const handleStyle = (pos: HandleType): React.CSSProperties => {
    const size = 10;
    const half = size / 2;
    const base: React.CSSProperties = {
      position: 'absolute', width: size, height: size,
      background: 'white', border: '1px solid rgba(0,0,0,0.3)',
      borderRadius: 1, zIndex: 30,
      cursor: HANDLE_CURSORS[pos],
    };
    switch (pos) {
      case 'nw': return { ...base, top: -half, left: -half };
      case 'ne': return { ...base, top: -half, right: -half };
      case 'sw': return { ...base, bottom: -half, left: -half };
      case 'se': return { ...base, bottom: -half, right: -half };
      case 'n': return { ...base, top: -half, left: '50%', marginLeft: -half };
      case 's': return { ...base, bottom: -half, left: '50%', marginLeft: -half };
      case 'w': return { ...base, top: '50%', left: -half, marginTop: -half };
      case 'e': return { ...base, top: '50%', right: -half, marginTop: -half };
      default: return base;
    }
  };

  const handles: HandleType[] = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Dark overlay with crop hole */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `linear-gradient(to right,
          rgba(0,0,0,0.5) ${crop.x}%,
          transparent ${crop.x}%,
          transparent ${crop.x + crop.width}%,
          rgba(0,0,0,0.5) ${crop.x + crop.width}%)`,
      }} />
      {/* Top dark band */}
      <div className="absolute pointer-events-none" style={{
        left: `${crop.x}%`, width: `${crop.width}%`,
        top: 0, height: `${crop.y}%`,
        background: 'rgba(0,0,0,0.5)',
      }} />
      {/* Bottom dark band */}
      <div className="absolute pointer-events-none" style={{
        left: `${crop.x}%`, width: `${crop.width}%`,
        top: `${crop.y + crop.height}%`, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
      }} />

      {/* Crop rectangle (draggable) */}
      <div
        style={{
          position: 'absolute',
          left: `${crop.x}%`, top: `${crop.y}%`,
          width: `${crop.width}%`, height: `${crop.height}%`,
          cursor: 'move',
          border: '2px solid white',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
        }}
        onPointerDown={(e) => handlePointerDown(e, 'move')}
      >
        {/* Rule of thirds grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
        </div>

        {/* Resize handles */}
        {handles.map(h => (
          <div key={h} style={handleStyle(h)} onPointerDown={(e) => handlePointerDown(e, h)} />
        ))}
      </div>

      {/* Floating buttons */}
      <div className="absolute z-30 flex gap-1" style={{
        left: `${crop.x}%`,
        top: `${Math.min(crop.y + crop.height + 1, 92)}%`,
      }}>
        <Button size="sm" variant="default" className="h-7 text-xs shadow-lg" onClick={() => onApply(crop)}>
          <Check className="h-3 w-3 mr-1" /> Appliquer
        </Button>
        <Button size="sm" variant="secondary" className="h-7 text-xs shadow-lg" onClick={onCancel}>
          <X className="h-3 w-3 mr-1" /> Annuler
        </Button>
        {initialCrop && (
          <Button size="sm" variant="secondary" className="h-7 text-xs shadow-lg" onClick={onReset}>
            <RotateCcw className="h-3 w-3 mr-1" /> Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}
