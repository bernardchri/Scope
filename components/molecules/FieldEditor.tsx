'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Collection, CollectionField } from '@/lib/types';
import { FIELD_KINDS, createField, getFieldKind } from '@/lib/collections';
import SpecFields from './SpecFields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface FieldEditorProps {
  field: CollectionField;
  collections: Collection[];
  onChange: (patch: Partial<CollectionField>) => void;
  onRemove: () => void;
}

/** Édite un champ de collection ; un champ « Répéteur » contient ses propres champs (récursif). */
export default function FieldEditor({ field, collections, onChange, onRemove }: FieldEditorProps) {
  const kind = getFieldKind(field.kind);
  const subFields = field.subFields ?? [];

  function updateSub(id: string, patch: Partial<CollectionField>) {
    onChange({ subFields: subFields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  }

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex gap-2 items-center">
        <Input
          key={`${field.id}-name`}
          className="h-8 text-sm"
          placeholder="Nom du champ (ex. titre)"
          defaultValue={field.name}
          onBlur={(e) => onChange({ name: e.target.value.trim() })}
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <Checkbox
            id={`req-${field.id}`}
            checked={!!field.required}
            onCheckedChange={(v) => onChange({ required: v === true })}
          />
          <Label htmlFor={`req-${field.id}`} className="font-normal text-xs cursor-pointer">Obligatoire</Label>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Supprimer le champ" onClick={onRemove}>
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
            onClick={() => onChange({
              kind: k.id,
              specs: undefined,
              relationTo: undefined,
              multiple: undefined,
              subFields: k.id === 'repeater' ? field.subFields ?? [] : undefined,
            })}
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
            onChange({ specs: Object.keys(specs).length ? specs : undefined });
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
              onChange={(e) => onChange({ relationTo: e.target.value || undefined })}
            >
              <option value="">—</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-1.5 pb-1.5">
            <Checkbox
              id={`multi-${field.id}`}
              checked={!!field.multiple}
              onCheckedChange={(v) => onChange({ multiple: v === true })}
            />
            <Label htmlFor={`multi-${field.id}`} className="font-normal text-xs cursor-pointer">Plusieurs entrées</Label>
          </div>
        </div>
      )}

      {field.kind === 'repeater' && (
        <div className="space-y-2 border-l-2 pl-3">
          <p className="text-xs text-muted-foreground">Champs d&apos;une ligne</p>
          {subFields.map((sub) => (
            <FieldEditor
              key={sub.id}
              field={sub}
              collections={collections}
              onChange={(patch) => updateSub(sub.id, patch)}
              onRemove={() => onChange({ subFields: subFields.filter((f) => f.id !== sub.id) })}
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => onChange({ subFields: [...subFields, createField()] })}
          >
            <Plus className="h-4 w-4" /> Ajouter un champ à la ligne
          </Button>
        </div>
      )}

      <Input
        key={`${field.id}-note`}
        className="h-8 text-sm"
        placeholder="Précision libre"
        defaultValue={field.note ?? ''}
        onBlur={(e) => onChange({ note: e.target.value.trim() || undefined })}
      />
    </div>
  );
}
