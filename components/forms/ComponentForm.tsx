import { useState } from 'react';
import { ComponentCategory } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/categoryHelpers';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ComponentFormProps {
  onSubmit: (name: string, description: string, category: ComponentCategory) => void;
  onCancel: () => void;
}

export default function ComponentForm({ onSubmit, onCancel }: ComponentFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComponentCategory>('element');

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit(name, description, category);
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-6 space-y-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du composant"
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
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button onClick={handleSubmit}>Créer</Button>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
      </CardFooter>
    </Card>
  );
}