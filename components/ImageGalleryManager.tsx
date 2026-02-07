'use client';

import { useState } from 'react';
import { ComponentImage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Trash2, Star, Upload } from 'lucide-react';
import { convertImageToBase64 } from '@/lib/imageHelpers';

interface ImageGalleryManagerProps {
  images: ComponentImage[];
  onChange: (images: ComponentImage[]) => void;
}

export default function ImageGalleryManager({ images, onChange }: ImageGalleryManagerProps) {
  const [imageError, setImageError] = useState<string | null>(null);

  async function handleAddImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    const result = await convertImageToBase64(file);

    if (result.valid && result.base64) {
      const newImage: ComponentImage = {
        id: `img-${Date.now()}`,
        base64: result.base64,
        caption: '',
        isPrimary: images.length === 0 // Première image = principale
      };

      onChange([...images, newImage]);
    } else {
      setImageError(result.error || 'Erreur inconnue');
    }

    // Reset input
    e.target.value = '';
  }

  function handleRemoveImage(imageId: string) {
    const newImages = images.filter(img => img.id !== imageId);
    
    // Si on supprime l'image principale et qu'il reste des images, mettre la première en principale
    if (newImages.length > 0 && !newImages.some(img => img.isPrimary)) {
      newImages[0].isPrimary = true;
    }

    onChange(newImages);
  }

  function handleSetPrimary(imageId: string) {
    const newImages = images.map(img => ({
      ...img,
      isPrimary: img.id === imageId
    }));
    onChange(newImages);
  }

  function handleUpdateCaption(imageId: string, caption: string) {
    const newImages = images.map(img =>
      img.id === imageId ? { ...img, caption } : img
    );
    onChange(newImages);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block font-semibold">Images du composant</label>
        <label htmlFor="add-image" className="cursor-pointer">
          <Button type="button" size="sm" asChild>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Ajouter une image
            </span>
          </Button>
          <input
            id="add-image"
            type="file"
            accept="image/*"
            onChange={handleAddImage}
            className="hidden"
          />
        </label>
      </div>

      {imageError && (
        <p className="text-destructive text-sm">{imageError}</p>
      )}

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded p-8 text-center">
          <p className="text-muted-foreground mb-2">Aucune image</p>
          <label htmlFor="add-image-empty" className="cursor-pointer">
            <Button type="button" variant="outline" size="sm" asChild>
              <span>
                📷 Ajouter la première image
              </span>
            </Button>
            <input
              id="add-image-empty"
              type="file"
              accept="image/*"
              onChange={handleAddImage}
              className="hidden"
            />
          </label>
          <p className="text-xs text-muted-foreground mt-2">Maximum 1 MB par image</p>
        </div>
      ) : (
        <div className="space-y-3">
          {images.map((image) => (
            <Card key={image.id} className="p-3">
              <div className="flex gap-3">
                {/* Miniature */}
                <div className="relative w-24 h-24 flex-shrink-0 rounded border overflow-hidden">
                  <img
                    src={image.base64}
                    alt={image.caption || 'Image'}
                    className="w-full h-full object-cover"
                  />
                  {image.isPrimary && (
                    <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                      ★ Principale
                    </div>
                  )}
                </div>

                {/* Caption + Actions */}
                <div className="flex-1 space-y-2">
                  <Input
                    value={image.caption || ''}
                    onChange={(e) => handleUpdateCaption(image.id, e.target.value)}
                    placeholder="Légende de l'image (optionnelle)"
                  />

                  <div className="flex gap-2">
                    {!image.isPrimary && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(image.id)}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Définir comme principale
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveImage(image.id)}
                      className="ml-auto"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}