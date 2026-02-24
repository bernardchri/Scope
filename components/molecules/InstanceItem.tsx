import { useState } from 'react';
import { Component, ComponentInstance } from '@/lib/types';
import { getCategoryLabel, getCategoryColor } from '@/lib/categoryHelpers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Trash2 } from 'lucide-react';

interface AvailablePin {
  pinId: string;
  imageId: string;
  imageIndex: number;
  imageCaption?: string;
  number: number;
}

interface InstanceItemProps {
  instance: ComponentInstance;
  component: Component;
  index: number;
  availablePins?: AvailablePin[];
  onNavigate: () => void;
  onRemove: () => void;
  onUpdatePinRef: (pinRef: ComponentInstance['pinRef']) => void;
}

export default function InstanceItem({
  instance,
  component,
  index,
  availablePins = [],
  onNavigate,
  onRemove,
  onUpdatePinRef,
}: InstanceItemProps) {
  const [showPinSelect, setShowPinSelect] = useState(false);

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

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <div className="font-semibold cursor-pointer" onClick={onNavigate}>
                {component.name} #{index + 1}
              </div>
              <Badge className={getCategoryColor(component.category)}>
                {getCategoryLabel(component.category).split(' ')[0]}
              </Badge>
              {instance.pinRef && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  #{instance.pinRef.pinNumber}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {component.tasks.length} élément{component.tasks.length > 1 ? 's' : ''}
            </p>
            {component.description && (
              <p className="text-xs text-muted-foreground italic mt-1">
                {component.description.length > 50
                  ? component.description.substring(0, 50) + '...'
                  : component.description}
              </p>
            )}

            {/* Select pin inline */}
            {showPinSelect && (
              <div className="mt-2">
                <Select
                  value={instance.pinRef ? `${instance.pinRef.imageId}::${instance.pinRef.pinId}` : 'none'}
                  onValueChange={(v) => {
                    if (v === 'none') {
                      onUpdatePinRef(undefined);
                    } else {
                      const [imageId, pinId] = v.split('::');
                      const pin = availablePins.find(p => p.pinId === pinId);
                      if (pin) onUpdatePinRef({ imageId, pinId, pinNumber: pin.number });
                    }
                    setShowPinSelect(false);
                  }}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Associer un pin…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun pin</SelectItem>
                    {availablePins.map(p => (
                      <SelectItem key={p.pinId} value={`${p.imageId}::${p.pinId}`}>
                        {p.imageCaption ?? `Image ${p.imageIndex + 1}`} — Pin #{p.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-1 shrink-0">
            {availablePins.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPinSelect(v => !v)}
                className={`h-8 w-8 opacity-20 hover:opacity-100 ${instance.pinRef ? 'opacity-60 text-primary' : ''}`}
                title="Associer un pin"
              >
                <MapPin className="h-4 w-4" />
              </Button>
            )}
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
