import { Component } from '@/lib/types';
import { getCategoryLabel, getCategoryColor } from '@/lib/categoryHelpers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ComponentDetailHeaderProps {
  component: Component;
  onEdit: () => void;
}

export default function ComponentDetailHeader({ component, onEdit }: ComponentDetailHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Titre + Badge + Bouton */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold flex-1">{component.name}</h1>
        <Badge className={getCategoryColor(component.category)}>
          {getCategoryLabel(component.category)}
        </Badge>
        <Button variant="outline" size="sm" onClick={onEdit}>
          Modifier
        </Button>
      </div>

      {/* Description */}
      {component.description && (
        <p className="text-muted-foreground italic">
          {component.description}
        </p>
      )}

      {/* Image en pleine largeur sur fond gris */}
      {component.imageBase64 && (
        <div className="w-full bg-gray-100 rounded-lg p-6 flex items-center justify-center">
          <img
            src={component.imageBase64}
            alt={component.name}
            className="max-w-full max-h-96 object-contain rounded"
          />
        </div>
      )}
    </div>
  );
}