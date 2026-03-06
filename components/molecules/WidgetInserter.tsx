'use client';

import { WidgetType } from '@/lib/types';
import { WIDGET_LABELS, WIDGET_ICONS } from '@/lib/categoryHelpers';
import { Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WidgetInserterProps {
  availableWidgets: WidgetType[];
  onAdd: (widget: WidgetType) => void;
  onAddParagraph: () => void;
}

export default function WidgetInserter({ availableWidgets, onAdd, onAddParagraph }: WidgetInserterProps) {
  return (
    <div className="group/inserter relative py-3">
      {/* Clickable zone — creates paragraph */}
      {/* <button
        className="absolute inset-0 w-full cursor-pointer"
        onClick={onAddParagraph}
        aria-label="Ajouter un paragraphe"
      /> */}
      {/* Horizontal line */}
      <div className="h-px bg-border opacity-0 group-hover/inserter:opacity-100 transition-opacity" />
      {/* + button */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/inserter:opacity-100 transition-opacity z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            {availableWidgets.map((w) => {
              const Icon = WIDGET_ICONS[w];
              return (
                <DropdownMenuItem key={w} onClick={() => onAdd(w)}>
                  <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                  {WIDGET_LABELS[w]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
