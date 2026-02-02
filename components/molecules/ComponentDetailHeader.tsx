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
    <div className="flex items-start gap-4">
      {component.imageBase64 && (
        <img 
          src={component.imageBase64} 
          alt={component.name}
          className="w-24 h-24 object-cover rounded border"
        />
      )}
      
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">{component.name}</h1>
          <Badge className={getCategoryColor(component.category)}>
            {getCategoryLabel(component.category)}
          </Badge>
          <Button variant="outline" size="sm" onClick={onEdit} className="ml-auto">
            Modifier
          </Button>
        </div>
        
        {component.description && (
          <p className="text-muted-foreground italic">
            {component.description}
          </p>
        )}
      </div>
    </div>
  );
}