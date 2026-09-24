import { useState } from 'react';
import { FigmaLink, ScopeItemType } from '@/lib/types';
import { SCOPE_ITEM_TYPES, TYPE_LABELS } from '@/lib/categoryHelpers';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ComponentEditFormProps {
  name: string;
  description?: string;
  category: ScopeItemType;
  estimatedHours?: number;
  figmaLink?: FigmaLink;
  onSubmit: (
    name: string,
    description: string,
    category: ScopeItemType,
    estimatedHours?: number,
    figmaLink?: FigmaLink,
  ) => void;
  onCancel: () => void;
}

export default function ComponentEditForm({
  name: initialName,
  description: initialDescription,
  category: initialCategory,
  estimatedHours: initialEstimatedHours,
  figmaLink: initialFigmaLink,
  onSubmit,
  onCancel
}: ComponentEditFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || '');
  const [category, setCategory] = useState(initialCategory);
  const [estimatedHours, setEstimatedHours] = useState<string>(
    initialEstimatedHours !== undefined ? String(initialEstimatedHours) : ''
  );
  const [figmaFileKey, setFigmaFileKey] = useState(initialFigmaLink?.fileKey || '');
  const [figmaGroupNodeId, setFigmaGroupNodeId] = useState(initialFigmaLink?.groupNodeId || '');

  function handleSubmit() {
    if (!name.trim()) return;
    const hours = estimatedHours !== '' ? parseFloat(estimatedHours) : undefined;
    const figmaLink: FigmaLink | undefined =
      figmaFileKey.trim() && figmaGroupNodeId.trim()
        ? { fileKey: figmaFileKey.trim(), groupNodeId: figmaGroupNodeId.trim(), lastSyncAt: initialFigmaLink?.lastSyncAt }
        : undefined;
    onSubmit(name, description, category, hours && !isNaN(hours) ? hours : undefined, figmaLink);
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

        <div className="space-y-2 pt-2 border-t">
          <Label className="text-sm text-muted-foreground">Lien Figma (optionnel)</Label>
          <div className="flex items-center gap-3">
            <Input
              value={figmaFileKey}
              onChange={(e) => setFigmaFileKey(e.target.value)}
              placeholder="File key"
              className="flex-1"
            />
            <Input
              value={figmaGroupNodeId}
              onChange={(e) => setFigmaGroupNodeId(e.target.value)}
              placeholder="ID du component set (pas un état/variant)"
              className="flex-1"
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button onClick={handleSubmit}>Enregistrer</Button>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
      </CardFooter>
    </Card>
  );
}
