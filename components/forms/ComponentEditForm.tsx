import { useState, useEffect } from 'react';
import { ComponentCategory } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/categoryHelpers';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { convertImageToBase64 } from '@/lib/imageHelpers';

interface ComponentEditFormProps {
  name: string;
  description?: string;
  category: ComponentCategory;
  imageBase64?: string;
  onSubmit: (name: string, description: string, category: ComponentCategory, imageBase64?: string) => void;
  onCancel: () => void;
}

export default function ComponentEditForm({
  name: initialName,
  description: initialDescription,
  category: initialCategory,
  imageBase64: initialImage,
  onSubmit,
  onCancel
}: ComponentEditFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || '');
  const [category, setCategory] = useState(initialCategory);
  const [imageBase64, setImageBase64] = useState<string | undefined>(initialImage);
  const [imageError, setImageError] = useState<string | null>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    const result = await convertImageToBase64(file);
    
    if (result.valid && result.base64) {
      setImageBase64(result.base64);
    } else {
      setImageError(result.error || 'Erreur inconnue');
    }
  }

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit(name, description, category, imageBase64);
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
        
        <Select value={category} onValueChange={(v) => setCategory(v as ComponentCategory)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Image upload */}
        <div>
          <label className="block font-semibold mb-2">Image du composant</label>
          
          {imageBase64 ? (
            <div className="relative inline-block">
              <img 
                src={imageBase64} 
                alt="Aperçu" 
                className="max-w-xs max-h-48 rounded border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 rounded-full w-8 h-8"
                onClick={() => setImageBase64(undefined)}
                type="button"
              >
                ×
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer text-blue-500 hover:text-blue-700"
              >
                📷 Cliquer pour ajouter une image
              </label>
              <p className="text-xs text-muted-foreground mt-1">Maximum 1 MB</p>
            </div>
          )}
          
          {imageError && (
            <p className="text-destructive text-sm mt-2">{imageError}</p>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button onClick={handleSubmit}>Enregistrer</Button>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
      </CardFooter>
    </Card>
  );
}