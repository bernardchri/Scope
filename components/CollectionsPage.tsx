'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Collection, CollectionField, Component } from '@/lib/types';
import { createCollection, createField } from '@/lib/collections';
import FieldEditor from '@/components/molecules/FieldEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CollectionsPageProps {
  collections: Collection[];
  components: Component[];
  onChange: (collections: Collection[]) => void;
  onSelectComponent: (id: string) => void;
  /** Collection à ouvrir à l'arrivée (depuis « À compléter »). */
  initialSelectedId?: string | null;
  className?: string;
}

/** Modèle de contenu du site : collections (custom post types) et leurs champs. */
export default function CollectionsPage({ collections, components, onChange, onSelectComponent, initialSelectedId, className }: CollectionsPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? collections[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const selected = collections.find((c) => c.id === selectedId) ?? null;

  function update(id: string, patch: Partial<Collection>) {
    onChange(collections.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function updateField(collection: Collection, fieldId: string, patch: Partial<CollectionField>) {
    update(collection.id, { fields: collection.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) });
  }

  function add() {
    const name = newName.trim();
    if (!name) return;
    const collection = createCollection(name, collections);
    onChange([...collections, collection]);
    setSelectedId(collection.id);
    setNewName('');
  }

  function remove(collection: Collection) {
    // Les relations qui pointaient vers cette collection sont retirées ; les pins liés l'ignorent d'eux-mêmes.
    onChange(
      collections
        .filter((c) => c.id !== collection.id)
        .map((c) => ({ ...c, fields: c.fields.map((f) => (f.relationTo === collection.id ? { ...f, relationTo: undefined } : f)) }))
    );
    setSelectedId(null);
  }

  // Composants dont au moins un pin utilise la collection (liste ou champ).
  const usedBy = (collection: Collection) =>
    components.filter((comp) =>
      (comp.images || []).some((img) =>
        (img.pins || []).some((p) => p.collectionId === collection.id || p.fieldRef?.collectionId === collection.id)
      )
    );

  return (
    <div className={`flex min-h-0 ${className ?? ''}`}>
      <div className="w-60 shrink-0 border-r p-4 space-y-2 overflow-y-auto">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Collections</h2>
        {collections.map((c) => (
          <Button
            key={c.id}
            variant={c.id === selectedId ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full justify-between"
            onClick={() => setSelectedId(c.id)}
          >
            <span className="truncate">{c.name}</span>
            <span className="text-xs text-muted-foreground">{c.fields.length}</span>
          </Button>
        ))}
        <div className="flex gap-1 pt-2">
          <Input
            className="h-8 text-sm"
            placeholder="Nouvelle collection"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          />
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={add} title="Créer la collection"><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {!selected ? (
          <div className="max-w-xl space-y-2 text-sm text-muted-foreground">
            <p className="text-foreground font-medium">Modèle de contenu</p>
            <p>
              Une collection décrit un type de contenu du site (comme un custom post type WordPress) : Projets, Articles, Équipe…
              Elle liste ses champs (titre, image, catégorie…) sans contenir les entrées elles-mêmes.
            </p>
            <p>Crée-en une à gauche, ou depuis un pin « Liste » dans un composant.</p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-6">
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <Input
                  key={`${selected.id}-name`}
                  className="text-lg font-semibold h-10"
                  defaultValue={selected.name}
                  onBlur={(e) => e.target.value.trim() && update(selected.id, { name: e.target.value.trim() })}
                />
                <Button variant="ghost" size="icon" title="Supprimer la collection" onClick={() => remove(selected)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 text-xs text-muted-foreground">
                  Identifiant technique
                  <Input
                    key={`${selected.id}-slug`}
                    className="h-8 text-sm font-mono"
                    defaultValue={selected.slug}
                    onBlur={(e) => update(selected.id, { slug: e.target.value.trim() })}
                  />
                </label>
                <div className="flex items-end gap-2 pb-1.5">
                  <Checkbox
                    id="detail-page"
                    checked={!!selected.hasDetailPage}
                    onCheckedChange={(v) => update(selected.id, { hasDetailPage: v === true })}
                  />
                  <Label htmlFor="detail-page" className="font-normal cursor-pointer">Chaque entrée a une page de détail</Label>
                </div>
              </div>
              <Input
                key={`${selected.id}-desc`}
                className="h-8 text-sm"
                placeholder="Description (à quoi sert ce type de contenu)"
                defaultValue={selected.description ?? ''}
                onBlur={(e) => update(selected.id, { description: e.target.value.trim() || undefined })}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Champs</h3>
              {selected.fields.map((field) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  collections={collections}
                  onChange={(patch) => updateField(selected, field.id, patch)}
                  onRemove={() => update(selected.id, { fields: selected.fields.filter((f) => f.id !== field.id) })}
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => update(selected.id, { fields: [...selected.fields, createField()] })}
              >
                <Plus className="h-4 w-4" /> Ajouter un champ
              </Button>
            </div>

            {usedBy(selected).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Utilisée dans</h3>
                <div className="flex flex-wrap gap-1.5">
                  {usedBy(selected).map((comp) => (
                    <Button key={comp.id} variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onSelectComponent(comp.id)}>
                      {comp.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
