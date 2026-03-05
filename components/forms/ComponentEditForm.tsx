import { useState } from 'react';
import { ScopeItemType } from '@/lib/types';
import { SCOPE_ITEM_TYPES, TYPE_LABELS } from '@/lib/categoryHelpers';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ComponentEditFormProps {
  name: string;
  description?: string;
  category: ScopeItemType;
  estimatedHours?: number;
  onSubmit: (name: string, description: string, category: ScopeItemType, estimatedHours?: number) => void;
  onCancel: () => void;
}

export default function ComponentEditForm({
  name: initialName,
  description: initialDescription,
  category: initialCategory,
  estimatedHours: initialEstimatedHours,
  onSubmit,
  onCancel
}: ComponentEditFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || '');
  const [category, setCategory] = useState(initialCategory);
  const [estimatedHours, setEstimatedHours] = useState<string>(
    initialEstimatedHours !== undefined ? String(initialEstimatedHours) : ''
  );

  function handleSubmit() {
    if (!name.trim()) return;
    const hours = estimatedHours !== '' ? parseFloat(estimatedHours) : undefined;
    onSubmit(name, description, category, hours && !isNaN(hours) ? hours : undefined);
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom"
          className="text-2xl font-bold"
          autoFocus
        />

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optionnelle)"
          rows={3}
        />

        <Select value={category} onValueChange={(v) => setCategory(v as ScopeItemType)}>
          <SelectTrigger>
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
          <span className="text-sm text-muted-foreground">heures estimees</span>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button onClick={handleSubmit}>Enregistrer</Button>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
      </CardFooter>
    </Card>
  );
}
