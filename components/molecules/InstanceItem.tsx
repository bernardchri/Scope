import { Component } from '@/lib/types';
import { getCategoryLabel, getCategoryColor } from '@/lib/categoryHelpers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface InstanceItemProps {
  component: Component;
  index: number;
  onNavigate: () => void;
  onRemove: () => void;
}

export default function InstanceItem({ component, index, onNavigate, onRemove }: InstanceItemProps) {
  return (
    <Card>
      <CardContent className="pt-6">
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
              <span className="font-semibold">{component.name} #{index + 1}</span>
              <Badge className={getCategoryColor(component.category)}>
                {getCategoryLabel(component.category).split(' ')[0]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {component.tasks.length} tâche(s)
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
            <Button variant="outline" size="sm" onClick={onNavigate}>
              →
            </Button>
            <Button variant="destructive" size="sm" onClick={onRemove}>
              ×
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}