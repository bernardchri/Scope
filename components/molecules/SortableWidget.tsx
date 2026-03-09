'use client';

import { type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, type LucideIcon } from 'lucide-react';

interface SortableWidgetProps {
  id: string;
  label: string;
  icon: LucideIcon;
  onRemove: () => void;
  children: ReactNode;
}

export default function SortableWidget({ id, label, icon: Icon, onRemove, children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`rounded-xl py-4 group/widget relative flex gap-1 ${isDragging ? 'h-8 overflow-hidden rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30' : ''}`}
    >
      {!isDragging && (
        <div className="flex flex-col items-center opacity-0 group-hover/widget:opacity-100 transition-opacity">
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5 rounded"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            onClick={onRemove}
            className="mt-2 text-muted-foreground hover:text-destructive p-0.5 rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className={`flex-1 min-w-0 ${isDragging ? 'invisible' : ''}`}>
        {children}
      </div>
    </div>
  );
}
