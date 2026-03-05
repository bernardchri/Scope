'use client';

import { WidgetType } from '@/lib/types';
import { WIDGET_LABELS, WIDGET_ICONS } from '@/lib/categoryHelpers';
import { Button } from '@/components/ui/button';

interface WidgetInserterProps {
  availableWidgets: WidgetType[];
  onAdd: (widget: WidgetType) => void;
}

export default function WidgetInserter({ availableWidgets, onAdd }: WidgetInserterProps) {
  if (availableWidgets.length === 0) return null;

  return (
    <div className="group/inserter py-4 flex items-center justify-center gap-2">
      <div className="flex items-center gap-1 opacity-0 group-hover/inserter:opacity-100 transition-opacity">
        {availableWidgets.map((w) => {
          const Icon = WIDGET_ICONS[w];
          return (
            <Button
              key={w}
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-7 px-2 text-xs"
              onClick={() => onAdd(w)}
            >
              <Icon className="h-3.5 w-3.5 mr-1" />
              {WIDGET_LABELS[w]}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
