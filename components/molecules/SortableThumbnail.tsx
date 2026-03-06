import { ComponentImage } from '@/lib/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';

interface SortableThumbnailProps {
  image: ComponentImage;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

export default function SortableThumbnail({ image, index, isActive, onClick, onDelete }: SortableThumbnailProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, flexShrink: 0 }}
      {...attributes}
      {...listeners}
      className="group relative"
    >
      <button
        onClick={onClick}
        className={`relative w-20 h-20 rounded border-2 overflow-hidden cursor-grab active:cursor-grabbing ${
          isActive ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-muted-foreground'
        }`}
      >
        <img
          src={image.base64}
          alt={image.caption || `Miniature ${index + 1}`}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
        {image.isPrimary && (
          <div className="absolute top-0 left-0 bg-primary text-primary-foreground text-[10px] px-1">★</div>
        )}
        {image.pins && image.pins.length > 0 && (
          <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl">
            {image.pins.length} 📍
          </div>
        )}
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute -top-2 -right-2 hidden group-hover:flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
