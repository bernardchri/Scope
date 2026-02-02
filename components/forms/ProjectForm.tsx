import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProjectFormProps {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export default function ProjectForm({ onSubmit, onCancel }: ProjectFormProps) {
  const [name, setName] = useState('');

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit(name);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du projet"
          autoFocus
        />
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={handleSubmit}>Créer</Button>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
      </CardFooter>
    </Card>
  );
}