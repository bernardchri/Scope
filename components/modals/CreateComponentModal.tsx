import { useState } from 'react';
import { ComponentCategory } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CATEGORY_LABELS, COMPONENT_CATEGORIES } from '@/lib/categoryHelpers';

interface CreateComponentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description: string, category: ComponentCategory) => void;
  isDocument?: boolean;
}

export default function CreateComponentModal({
  open,
  onOpenChange,
  onSubmit,
  isDocument = false,
}: CreateComponentModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComponentCategory>('element');

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit(name, description, isDocument ? 'document' : category);
    setName('');
    setDescription('');
    setCategory('element');
  }

  function handleCancel() {
    onOpenChange(false);
    setName('');
    setDescription('');
    setCategory('element');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isDocument ? 'Nouveau document' : 'Nouveau composant'}</DialogTitle>
          <DialogDescription>
            {isDocument
              ? 'Créer un document markdown (cahier des charges, spécifications…)'
              : 'Créer un composant UI pour votre projet.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">{isDocument ? 'Titre du document *' : 'Nom du composant *'}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isDocument ? 'Ex: Cahier des charges, Brief…' : 'Ex: Hero Section, Bouton CTA…'}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description optionnelle…"
              rows={3}
            />
          </div>

          {!isDocument && (
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ComponentCategory)}>
                <SelectTrigger id="category">
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
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
