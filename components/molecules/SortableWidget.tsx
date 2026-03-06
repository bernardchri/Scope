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
      className="group/widget relative"
    >
      <div className="flex items-center gap-2 mb-2 opacity-0 group-hover/widget:opacity-100 transition-opacity">
        <button
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5 rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <button
          onClick={onRemove}
          className="ml-auto text-muted-foreground hover:text-destructive p-0.5 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}
