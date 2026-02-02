import { Component } from '@/lib/types';
import { getCategoryLabel, getCategoryColor } from '@/lib/categoryHelpers';
import { Badge } from '@/components/ui/badge';

interface ComponentHeaderProps {
  component: Component;
}

export default function ComponentHeader({ component }: ComponentHeaderProps) {
  return (
    <div className="flex items-start gap-3 w-full">
      <div className="flex-1">
        <div className="flex items-start gap-2 mb-2">
          <Badge className={getCategoryColor(component.category)}>
            {getCategoryLabel(component.category)}
          </Badge>
          <h3 className="font-semibold text-lg">{component.name}</h3>
        </div>
        
        {component.description && (
          <p className="text-sm text-gray-600 italic">
            {component.description}
          </p>
        )}
      </div>

      {component.imageBase64 && (
        <img
          src={component.imageBase64}
          alt={component.name}
          className="w-60 h-16 rounded border flex-shrink-0 object-contain"
        />
      )}
    </div>
  );
}