'use client';

import { Collection, ImagePin } from '@/lib/types';
import { PIN_KINDS, getPinKind } from '@/lib/pinKinds';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SpecFields from './SpecFields';
import CollectionPicker from './CollectionPicker';

interface PinSpecEditorProps {
  pin: ImagePin;
  onChange: (pin: ImagePin) => void;
  /** Modèle de contenu du projet : collections à lier au pin. */
  collections?: Collection[];
  onCreateCollection?: (collection: Collection) => void;
}

/**
 * Précise un pin en un clic : type (Titre, Texte, Image…) puis champs propres
 * au type (longueur max, éditable en backoffice, balise SEO…). Exporté dans le
 * Markdown (prompt IA) et lu par le développeur.
 */
export default function PinSpecEditor({ pin, onChange, collections = [], onCreateCollection = () => {} }: PinSpecEditorProps) {
  const kind = getPinKind(pin.kind);
  const fieldOptions = collections.flatMap((c) =>
    c.fields.filter((f) => f.name).map((f) => ({ value: `${c.id}:${f.id}`, label: `${c.name} › ${f.name}` }))
  );

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
            onClick={() => onChange(pin.kind === k.id ? { ...pin, kind: undefined, specs: undefined, collectionId: undefined, fieldRef: undefined } : { ...pin, kind: k.id, specs: undefined, collectionId: undefined, fieldRef: undefined })}
          >
            {k.label}
          </Button>
        ))}
      </div>

      {kind && <SpecFields kind={kind} specs={pin.specs} onSetSpec={setSpec} scope={pin.id} />}

      {pin.kind === 'list' && (
        <label className="space-y-1 text-xs text-muted-foreground block">
          Collection affichée
          <CollectionPicker
            collections={collections}
            value={pin.collectionId}
            onChange={(collectionId) => onChange({ ...pin, collectionId })}
            onCreate={onCreateCollection}
          />
        </label>
      )}

      {pin.kind && pin.kind !== 'list' && fieldOptions.length > 0 && (
        <label className="space-y-1 text-xs text-muted-foreground block">
          Champ de collection
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
            value={pin.fieldRef ? `${pin.fieldRef.collectionId}:${pin.fieldRef.fieldId}` : ''}
            onChange={(e) => {
              const [collectionId, fieldId] = e.target.value.split(':');
              onChange({ ...pin, fieldRef: e.target.value ? { collectionId, fieldId } : undefined });
            }}
          >
            <option value="">— (non lié)</option>
            {fieldOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
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
