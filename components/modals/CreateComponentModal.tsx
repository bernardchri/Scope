import { useState } from 'react';
import { ScopeItemType } from '@/lib/types';
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
import { SCOPE_ITEM_TYPES, TYPE_LABELS } from '@/lib/categoryHelpers';

interface CreateComponentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description: string, category: ScopeItemType) => void;
}

export default function CreateComponentModal({
  open,
  onOpenChange,
  onSubmit,
}: CreateComponentModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ScopeItemType>('component');

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit(name, description, category);
    setName('');
    setDescription('');
    setCategory('component');
  }

  function handleCancel() {
    onOpenChange(false);
    setName('');
    setDescription('');
    setCategory('component');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouvel element</DialogTitle>
          <DialogDescription>
            Choisissez un type et donnez un nom a votre element.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Type *</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ScopeItemType)}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_ITEM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Hero Section, Brief technique..."
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
              placeholder="Description optionnelle..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>Creer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
