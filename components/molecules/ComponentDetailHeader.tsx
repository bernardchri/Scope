import { Component } from '@/lib/types';
import { getCategoryLabel, getCategoryColor } from '@/lib/categoryHelpers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ImageCarousel from '../ImageCarousel'; // 🆕

interface ComponentDetailHeaderProps {
  component: Component;
  onEdit: () => void;
}

export default function ComponentDetailHeader({ component, onEdit }: ComponentDetailHeaderProps) {
  // 🆕 Convertir ancienne structure en nouvelle si nécessaire
  const images = component.images || (component.imageBase64 ? [{
    id: 'legacy',
    base64: component.imageBase64,
    isPrimary: true
  }] : []);

  return (
    <div className="space-y-4">
      {/* Titre + Badge catégorie + Bouton */}
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

      {/* Estimation de temps */}
      {component.estimatedHours !== undefined && (
        <p className="text-sm font-medium text-orange-600">
          ⏱ Estimation : {component.estimatedHours}h
        </p>
      )}

      {/* 🆕 Carrousel d'images */}
      <ImageCarousel images={images} />
    </div>
  );
}