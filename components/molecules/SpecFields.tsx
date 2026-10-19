'use client';

import { PinKind } from '@/lib/pinKinds';
import { Input } from '@/components/ui/input';

interface SpecFieldsProps {
  kind: PinKind;
  specs?: Record<string, string>;
  onSetSpec: (fieldId: string, value: string) => void;
  /** Clé stable (id du pin/champ + type) : remet à zéro les champs texte quand elle change. */
  scope: string;
}

/** Champs de spécification d'un type (longueur max, balise SEO…), communs aux pins et aux champs de collection. */
export default function SpecFields({ kind, specs, onSetSpec, scope }: SpecFieldsProps) {
  if (kind.fields.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {kind.fields.map((field) => (
        <label key={field.id} className="space-y-1 text-xs text-muted-foreground">
          {field.label}
          {field.type === 'select' ? (
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
              value={specs?.[field.id] ?? ''}
              onChange={(e) => onSetSpec(field.id, e.target.value)}
            >
              <option value="">—</option>
              {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <Input
              key={`${scope}-${kind.id}-${field.id}`}
              className="h-8 text-sm"
              type={field.type === 'number' ? 'number' : 'text'}
              min={field.type === 'number' ? 0 : undefined}
              placeholder={field.placeholder}
              defaultValue={specs?.[field.id] ?? ''}
              onBlur={(e) => onSetSpec(field.id, e.target.value.trim())}
            />
          )}
        </label>
      ))}
    </div>
  );
}
