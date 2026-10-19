'use client';

import { useState } from 'react';
import { Collection } from '@/lib/types';
import { createCollection } from '@/lib/collections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CollectionPickerProps {
  collections: Collection[];
  value?: string;
  onChange: (collectionId: string | undefined) => void;
  /** Ajoute une collection au projet (retour : elle est ensuite choisie). */
  onCreate: (collection: Collection) => void;
}

/** Choisit une collection existante ou en crée une à la volée (pin « Liste »). */
export default function CollectionPicker({ collections, value, onChange, onCreate }: CollectionPickerProps) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');

  function submit() {
    const name = draft.trim();
    if (!name) { setCreating(false); return; }
    const collection = createCollection(name, collections);
    onCreate(collection);
    onChange(collection.id);
    setDraft('');
    setCreating(false);
  }

  if (creating) {
    return (
      <div className="flex gap-1">
        <Input
          autoFocus
          className="h-8 text-sm"
          placeholder="Nom de la collection (ex. Projets)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setCreating(false); }}
        />
        <Button type="button" size="sm" className="h-8" onClick={submit}>Créer</Button>
      </div>
    );
  }

  return (
    <select
      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
      value={value ?? ''}
      onChange={(e) => {
        if (e.target.value === '__new__') setCreating(true);
        else onChange(e.target.value || undefined);
      }}
    >
      <option value="">—</option>
      {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      <option value="__new__">+ Nouvelle collection…</option>
    </select>
  );
}
