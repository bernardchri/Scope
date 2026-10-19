'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Collection, CollectionField, Component } from '@/lib/types';
import { FIELD_KINDS, createCollection, createField, getFieldKind } from '@/lib/collections';
import SpecFields from '@/components/molecules/SpecFields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CollectionsPageProps {
  collections: Collection[];
  components: Component[];
  onChange: (collections: Collection[]) => void;
  onSelectComponent: (id: string) => void;
  className?: string;
}

/** Modèle de contenu du site : collections (custom post types) et leurs champs. */
export default function CollectionsPage({ collections, components, onChange, onSelectComponent, className }: CollectionsPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(collections[0]?.id ?? null);
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
              {selected.fields.map((field) => {
                const kind = getFieldKind(field.kind);
                return (
                  <div key={field.id} className="rounded-lg border p-3 space-y-3">
                    <div className="flex gap-2 items-center">
                      <Input
                        key={`${field.id}-name`}
                        className="h-8 text-sm"
                        placeholder="Nom du champ (ex. titre)"
                        defaultValue={field.name}
                        onBlur={(e) => updateField(selected, field.id, { name: e.target.value.trim() })}
                      />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Checkbox
                          id={`req-${field.id}`}
                          checked={!!field.required}
                          onCheckedChange={(v) => updateField(selected, field.id, { required: v === true })}
                        />
                        <Label htmlFor={`req-${field.id}`} className="font-normal text-xs cursor-pointer">Obligatoire</Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        title="Supprimer le champ"
                        onClick={() => update(selected.id, { fields: selected.fields.filter((f) => f.id !== field.id) })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {FIELD_KINDS.map((k) => (
                        <Button
                          key={k.id}
                          type="button"
                          size="sm"
                          variant={field.kind === k.id ? 'default' : 'outline'}
                          className="h-7 px-2 text-xs"
                          onClick={() => updateField(selected, field.id, { kind: k.id, specs: undefined, relationTo: undefined, multiple: undefined })}
                        >
                          {k.label}
                        </Button>
                      ))}
                    </div>
                    {kind && (
                      <SpecFields
                        kind={kind}
                        specs={field.specs}
                        scope={field.id}
                        onSetSpec={(id, value) => {
                          const specs = { ...(field.specs || {}) };
                          if (value) specs[id] = value; else delete specs[id];
                          updateField(selected, field.id, { specs: Object.keys(specs).length ? specs : undefined });
                        }}
                      />
                    )}
                    {field.kind === 'relation' && (
                      <div className="flex gap-3 items-end">
                        <label className="space-y-1 text-xs text-muted-foreground flex-1">
                          Pointe vers
                          <select
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
                            value={field.relationTo ?? ''}
                            onChange={(e) => updateField(selected, field.id, { relationTo: e.target.value || undefined })}
                          >
                            <option value="">—</option>
                            {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </label>
                        <div className="flex items-center gap-1.5 pb-1.5">
                          <Checkbox
                            id={`multi-${field.id}`}
                            checked={!!field.multiple}
                            onCheckedChange={(v) => updateField(selected, field.id, { multiple: v === true })}
                          />
                          <Label htmlFor={`multi-${field.id}`} className="font-normal text-xs cursor-pointer">Plusieurs entrées</Label>
                        </div>
                      </div>
                    )}
                    <Input
                      key={`${field.id}-note`}
                      className="h-8 text-sm"
                      placeholder="Précision libre"
                      defaultValue={field.note ?? ''}
                      onBlur={(e) => updateField(selected, field.id, { note: e.target.value.trim() || undefined })}
                    />
                  </div>
                );
              })}
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
