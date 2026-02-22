import { useState, useEffect } from 'react';
import { ComponentCategory, ComponentImage } from '@/lib/types';
import { CATEGORY_LABELS, COMPONENT_CATEGORIES } from '@/lib/categoryHelpers';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageGalleryManager from '../ImageGalleryManager'; // 🆕

interface ComponentEditFormProps {
  name: string;
  description?: string;
  category: ComponentCategory;
  estimatedHours?: number;
  imageBase64?: string; // @deprecated
  images?: ComponentImage[];
  onSubmit: (name: string, description: string, category: ComponentCategory, images: ComponentImage[], estimatedHours?: number) => void;
  onCancel: () => void;
}

export default function ComponentEditForm({
  name: initialName,
  description: initialDescription,
  category: initialCategory,
  estimatedHours: initialEstimatedHours,
  imageBase64: initialImageBase64,
  images: initialImages,
  onSubmit,
  onCancel
}: ComponentEditFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || '');
  const [category, setCategory] = useState(initialCategory);
  const [estimatedHours, setEstimatedHours] = useState<string>(
    initialEstimatedHours !== undefined ? String(initialEstimatedHours) : ''
  );
  
  // 🆕 Gérer la galerie d'images
  const [images, setImages] = useState<ComponentImage[]>(() => {
    // Migrer ancienne structure si nécessaire
    if (initialImages && initialImages.length > 0) {
      return initialImages;
    } else if (initialImageBase64) {
      return [{
        id: 'legacy',
        base64: initialImageBase64,
        isPrimary: true
      }];
    }
    return [];
  });

  function handleSubmit() {
    if (!name.trim()) return;
    const hours = estimatedHours !== '' ? parseFloat(estimatedHours) : undefined;
    onSubmit(name, description, category, images, hours && !isNaN(hours) ? hours : undefined);
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du composant"
          className="text-2xl font-bold"
          autoFocus
        />
        
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optionnelle)"
          rows={3}
        />
        
        {initialCategory === 'document' ? (
          <div className="text-sm text-muted-foreground px-1">
            Type : {CATEGORY_LABELS['document']}
          </div>
        ) : (
          <Select value={category} onValueChange={(v) => setCategory(v as ComponentCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPONENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Estimation de temps */}
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min="0"
            step="0.5"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
            placeholder="Estimation (heures)"
            className="w-48"
          />
          <span className="text-sm text-muted-foreground">heures estimées</span>
        </div>

        {/* Gestionnaire de galerie d'images */}
        <ImageGalleryManager
          images={images}
          onChange={setImages}
        />
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button onClick={handleSubmit}>Enregistrer</Button>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
      </CardFooter>
    </Card>
  );
}