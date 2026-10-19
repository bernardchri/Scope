'use client';

import { ImagePin, Task, CropRect } from '@/lib/types';
import { pinToCroppedSpace } from '@/lib/imageHelpers';

interface PinsOverlayProps {
  pins: ImagePin[];
  tasks: Task[];
  selectedPinId: string | null;
  draggingPinId: string | null;
  /** Facteur de zoom inverse pour garder les badges à taille fixe (default: 1) */
  zoom?: number;
  crop?: CropRect;
  onPinPointerDown: (e: React.PointerEvent, pinId: string) => void;
  onPinClick: (e: React.MouseEvent, pinId: string) => void;
  /** Composant lié à chaque pin (via une instance), affiché à côté du pin. */
  pinLinks?: Record<string, { id: string; name: string }>;
  onNavigate?: (componentId: string) => void;
}

export default function PinsOverlay({
  pins,
  tasks,
  selectedPinId,
  draggingPinId,
  zoom = 1,
  crop,
  onPinPointerDown,
  onPinClick,
  pinLinks,
  onNavigate,
}: PinsOverlayProps) {
  const displayPins = crop
    ? pins.map(p => pinToCroppedSpace(p, crop)).filter(p => p.visible)
    : pins;

  return (
    <>
      {displayPins.map(pin => {
        const linkedTask = tasks.find(t => t.pinRef?.pinId === pin.id);
        const isSelected = pin.id === selectedPinId;
        const link = pinLinks?.[pin.id];
        return (
          <div
            key={pin.id}
            data-pin
            style={{
              position: 'absolute',
              left: `${pin.x}%`,
              top: `${pin.y}%`,
              transform: `translate(-50%, -50%) scale(${1 / zoom})`,
              cursor: draggingPinId === pin.id ? 'grabbing' : 'grab',
              zIndex: 10,
            }}
            onPointerDown={(e) => onPinPointerDown(e, pin.id)}
            onClick={(e) => onPinClick(e, pin.id)}
            title={linkedTask ? `Pin #${pin.number} — ${linkedTask.name}` : `Pin #${pin.number}`}
            className={`
              w-7 h-7 rounded-full flex items-center justify-center
              relative text-xs font-bold shadow-md transition-colors
              ${isSelected
                ? 'bg-destructive text-destructive-foreground ring-2 ring-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/80'
              }
            `}
          >
            {pin.number}
            {link && (
              <button
                type="button"
                title={`Ouvrir ${link.name}`}
                // Évite de déclencher le drag / la sélection du pin
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onNavigate?.(link.id); }}
                className="absolute left-full ml-1.5 max-w-[160px] truncate rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium text-foreground shadow ring-1 ring-border hover:underline cursor-pointer"
              >
                {link.name}
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
