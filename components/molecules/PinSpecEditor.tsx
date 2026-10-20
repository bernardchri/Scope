'use client';

import { Collection, ImagePin, Task } from '@/lib/types';
import { PIN_KINDS, PinKind, getPinKind } from '@/lib/pinKinds';
import { ask } from '@tauri-apps/plugin-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { flattenFields } from '@/lib/collections';
import SpecFields from './SpecFields';
import CollectionPicker from './CollectionPicker';

interface PinSpecEditorProps {
  pin: ImagePin;
  onChange: (pin: ImagePin) => void;
  /** Modèle de contenu du projet : collections à lier au pin. */
  collections?: Collection[];
  /** Nom du composant relié à ce pin (permet « chaque ligne = ce composant » pour un répéteur). */
  linkedComponentName?: string;
  /** Tâches liées à ce pin : le pin devient un point de la todo-liste, avec son état d'avancement. */
  linkedTasks?: Task[];
  onAddTask?: () => void;
  onToggleTask?: (taskId: string) => void;
  onCreateCollection?: (collection: Collection) => void;
}

/** Répéteur : « Contenu d'une ligne » n'a de sens que relié à un composant, et remplace la liste libre des champs. */
function visibleKind(kind: PinKind, pin: ImagePin, linked: boolean): PinKind {
  if (kind.id !== 'repeater') return kind;
  const rowFromComponent = linked && !!pin.specs?.rowSource;
  return { ...kind, fields: kind.fields.filter((f) => (f.id === 'rowSource' ? linked : f.id === 'rowFields' ? !rowFromComponent : true)) };
}

/**
 * Précise un pin en un clic : type (Titre, Texte, Image…) puis champs propres
 * au type (longueur max, éditable en backoffice, balise SEO…). Exporté dans le
 * Markdown (prompt IA) et lu par le développeur.
 */
export default function PinSpecEditor({ pin, onChange, collections = [], linkedComponentName, linkedTasks = [], onAddTask, onToggleTask, onCreateCollection = () => {} }: PinSpecEditorProps) {
  const kind = getPinKind(pin.kind);
  const fieldOptions = collections.flatMap((c) =>
    flattenFields(c.fields).filter((f) => f.field.name).map((f) => ({ value: `${c.id}:${f.field.id}`, label: `${c.name} › ${f.path}` }))
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
            onClick={async () => {
              const hasData = !!(pin.specs || pin.collectionId || pin.fieldRef);
              if (pin.kind && hasData) {
                const ok = await ask('Changer le type efface les précisions et les liens de collection de ce pin. Continuer ?', { title: 'Changer le type', kind: 'warning' });
                if (!ok) return;
              }
              onChange(pin.kind === k.id ? { ...pin, kind: undefined, specs: undefined, collectionId: undefined, fieldRef: undefined } : { ...pin, kind: k.id, specs: undefined, collectionId: undefined, fieldRef: undefined });
            }}
          >
            {k.label}
          </Button>
        ))}
      </div>

      {kind && <SpecFields kind={visibleKind(kind, pin, !!linkedComponentName)} specs={pin.specs} onSetSpec={setSpec} scope={pin.id} />}

      {(pin.kind === 'list' || pin.kind === 'relation') && (
        <label className="space-y-1 text-xs text-muted-foreground block">
          {pin.kind === 'list' ? 'Collection affichée' : 'Collection liée'}
          <CollectionPicker
            collections={collections}
            value={pin.collectionId}
            onChange={(collectionId) => onChange({ ...pin, collectionId })}
            onCreate={onCreateCollection}
          />
        </label>
      )}

      {pin.kind && pin.kind !== 'list' && pin.kind !== 'relation' && fieldOptions.length > 0 && (
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

      {/* Tâches du pin : son état d'avancement (à faire, en cours, fait) en découle */}
      {onAddTask && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {linkedTasks.length === 0
                ? 'Aucune tâche liée à ce pin'
                : `Tâches de ce pin : ${linkedTasks.filter(t => t.completed).length}/${linkedTasks.length} faite${linkedTasks.filter(t => t.completed).length > 1 ? 's' : ''}`}
            </span>
            <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={onAddTask}>
              {linkedTasks.length === 0 ? 'Créer la tâche de ce pin' : '+ Tâche'}
            </Button>
          </div>
          {linkedTasks.map((task) => (
            <label key={task.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={task.completed} onCheckedChange={() => onToggleTask?.(task.id)} />
              <span className={task.completed ? 'line-through text-muted-foreground' : ''}>{task.name}</span>
            </label>
          ))}
        </div>
      )}

      {/* Nom de l'élément : sans lui, « Titre, max 128 » ne dit pas de quel titre de la page il s'agit. */}
      {!linkedComponentName && (
        <Input
          key={`${pin.id}-label`}
          className="h-8 text-sm"
          placeholder="Nom de l'élément (ex. Titre du hero, Bouton « Acheter »)"
          defaultValue={pin.label ?? ''}
          onBlur={(e) => onChange({ ...pin, label: e.target.value.trim() || undefined })}
        />
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
