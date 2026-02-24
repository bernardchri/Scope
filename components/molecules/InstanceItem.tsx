import { Component } from '@/lib/types';
import { getCategoryLabel, getCategoryColor } from '@/lib/categoryHelpers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

interface InstanceItemProps {
  component: Component;
  index: number;
  onNavigate: () => void;
  onRemove: () => void;
}

export default function InstanceItem({ component, index, onNavigate, onRemove }: InstanceItemProps) {
  return (
    <Card className="group/item hover:shadow-sm transition-shadow h-full">
      <CardContent className="py-3 px-4">
        <div className="flex justify-between items-start gap-3">
          {component.imageBase64 && (
            <img
              src={component.imageBase64}
              alt={component.name}
              className="w-12 h-12 object-cover rounded border flex-shrink-0"
            />
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-semibold cursor-pointer " onClick={onNavigate}>{component.name} #{index + 1}</div>
              <Badge className={getCategoryColor(component.category)}>
                {getCategoryLabel(component.category).split(' ')[0]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {component.tasks.length} élément{component.tasks.length > 1 ? 's' : ''}
            </p>
            {component.description && (
              <p className="text-xs text-muted-foreground italic mt-1">
                {component.description.length > 50
                  ? component.description.substring(0, 50) + '...'
                  : component.description
                }
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 hover:text-destructive cursor-pointer opacity-20 hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}