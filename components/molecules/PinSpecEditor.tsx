'use client';

import { ImagePin } from '@/lib/types';
import { PIN_KINDS, getPinKind } from '@/lib/pinKinds';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PinSpecEditorProps {
  pin: ImagePin;
  onChange: (pin: ImagePin) => void;
}

/**
 * Précise un pin en un clic : type (Titre, Texte, Image…) puis champs propres
 * au type (longueur max, éditable en backoffice, balise SEO…). Exporté dans le
 * Markdown (prompt IA) et lu par le développeur.
 */
export default function PinSpecEditor({ pin, onChange }: PinSpecEditorProps) {
  const kind = getPinKind(pin.kind);

  function setSpec(fieldId: string, value: string) {
    const specs = { ...(pin.specs || {}) };
    if (value) specs[fieldId] = value;
    else delete specs[fieldId];
    onChange({ ...pin, specs: Object.keys(specs).length ? specs : undefined });
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3" data-pin-editor>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-medium mr-1">Pin #{pin.number}</span>
        {PIN_KINDS.map((k) => (
          <Button
            key={k.id}
            type="button"
            size="sm"
            variant={pin.kind === k.id ? 'default' : 'outline'}
            className="h-7 px-2 text-xs"
            // Un deuxième clic retire le type ; les specs d'un autre type ne sont pas conservées.
            onClick={() => onChange(pin.kind === k.id ? { ...pin, kind: undefined, specs: undefined } : { ...pin, kind: k.id, specs: undefined })}
          >
            {k.label}
          </Button>
        ))}
      </div>

      {kind && kind.fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {kind.fields.map((field) => (
            <label key={field.id} className="space-y-1 text-xs text-muted-foreground">
              {field.label}
              {field.type === 'select' ? (
                <select
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
                  value={pin.specs?.[field.id] ?? ''}
                  onChange={(e) => setSpec(field.id, e.target.value)}
                >
                  <option value="">—</option>
                  {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <Input
                  key={`${pin.id}-${pin.kind}-${field.id}`}
                  className="h-8 text-sm"
                  type={field.type === 'number' ? 'number' : 'text'}
                  min={field.type === 'number' ? 0 : undefined}
                  placeholder={field.placeholder}
                  defaultValue={pin.specs?.[field.id] ?? ''}
                  onBlur={(e) => setSpec(field.id, e.target.value.trim())}
                />
              )}
            </label>
          ))}
        </div>
      )}

      <Input
        key={`${pin.id}-note`}
        className="h-8 text-sm"
        placeholder="Précision libre (comportement, contrainte, exemple…)"
        defaultValue={pin.note ?? ''}
        onBlur={(e) => onChange({ ...pin, note: e.target.value.trim() || undefined })}
      />
    </div>
  );
}
