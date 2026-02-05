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
import { CATEGORY_LABELS } from '@/lib/categoryHelpers';

interface CreateComponentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description: string, category: ComponentCategory) => void;
}

export default function CreateComponentModal({
  open,
  onOpenChange,
  onSubmit
}: CreateComponentModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComponentCategory>('element');

  function handleSubmit() {
    if (!name.trim()) return;
    
    onSubmit(name, description, category);
    
    // Reset
    setName('');
    setDescription('');
    setCategory('element');
  }

  function handleCancel() {
    onOpenChange(false);
    // Reset
    setName('');
    setDescription('');
    setCategory('element');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouveau composant</DialogTitle>
          <DialogDescription>
            Créer un nouveau composant ou document pour votre projet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du composant *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Hero Section, Bouton CTA..."
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description optionnelle..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie *</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ComponentCategory)}>
              <SelectTrigger id="category">
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}