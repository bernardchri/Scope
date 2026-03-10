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
}: PinsOverlayProps) {
  const displayPins = crop
    ? pins.map(p => pinToCroppedSpace(p, crop)).filter(p => p.visible)
    : pins;

  return (
    <>
      {displayPins.map(pin => {
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
              transform: `translate(-50%, -50%) scale(${1 / zoom})`,
              cursor: draggingPinId === pin.id ? 'grabbing' : 'grab',
              zIndex: 10,
            }}
            onPointerDown={(e) => onPinPointerDown(e, pin.id)}
            onClick={(e) => onPinClick(e, pin.id)}
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
    </>
  );
}
