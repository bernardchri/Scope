import { useEffect, useMemo, useState } from 'react';
import { Component } from '@/lib/types';
import { FigmaImportPayload, FigmaImportResult, applyFigmaImport, dropOrphanedPins, normalizeFigmaCategory } from '@/lib/figmaImport';
import { SCOPE_ITEM_TYPES, TYPE_LABELS } from '@/lib/categoryHelpers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NEW_COMPONENT_VALUE = '__new__';

interface FigmaImportDialogProps {
  payload: FigmaImportPayload | null;
  components: Component[];
  folderPath: string;
  onClose: () => void;
  onCreate: (updates: Partial<Component>) => void;
  onUpdate: (componentId: string, updates: Partial<Component>) => void;
}

export default function FigmaImportDialog({
  payload,
  components,
  folderPath,
  onClose,
  onCreate,
  onUpdate,
}: FigmaImportDialogProps) {
  const open = !!payload;

  const matchedExisting = useMemo(
    () => components.find((c) => c.figmaLink?.groupNodeId === payload?.groupNodeId) || null,
    [components, payload]
  );

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('component');
  const [target, setTarget] = useState<string>(NEW_COMPONENT_VALUE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // pendingResult !== null pendant l'étape de revue des pins orphelins (les
  // trois infos — updates, image concernée, pins orphelins — vont toujours
  // ensemble, d'où un seul state plutôt que trois à garder synchronisés).
  const [pendingResult, setPendingResult] = useState<FigmaImportResult | null>(null);
  const [pinsToDelete, setPinsToDelete] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!payload) return;
    setName(payload.name);
    setCategory(normalizeFigmaCategory(payload.category));
    setTarget(matchedExisting?.id || NEW_COMPONENT_VALUE);
    setError(null);
    setPendingResult(null);
  }, [payload, matchedExisting]);

  if (!payload) return null;

  const existing = target === NEW_COMPONENT_VALUE ? undefined : components.find((c) => c.id === target);
  const reviewingOrphans = pendingResult !== null;

  async function handleImport() {
    if (!payload) return;
    setBusy(true);
    setError(null);
    try {
      const result = await applyFigmaImport(
        folderPath,
        { ...payload, name, category },
        existing
      );
      if (result.orphanedPins.length > 0) {
        setPendingResult(result);
        setPinsToDelete(new Set(result.orphanedPins.map((p) => p.id)));
      } else {
        commit(result.componentUpdates);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'import.");
    } finally {
      setBusy(false);
    }
  }

  function commit(updates: Partial<Component>) {
    if (existing) {
      onUpdate(existing.id, updates);
    } else {
      onCreate(updates);
    }
    onClose();
  }

  function handleConfirmOrphans() {
    if (!pendingResult) return;
    const finalUpdates = dropOrphanedPins(pendingResult.componentUpdates, pendingResult.imageId, Array.from(pinsToDelete));
    commit(finalUpdates);
  }

  function togglePin(id: string) {
    setPinsToDelete((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import depuis Figma</DialogTitle>
          <DialogDescription>
            {reviewingOrphans
              ? "Certaines zones d'intérêt n'existent plus dans Figma."
              : 'Un composant/frame a été poussé depuis le plugin Figma.'}
          </DialogDescription>
        </DialogHeader>

        {!reviewingOrphans ? (
          <div className="space-y-4 py-2">
            <img
              src={`data:image/png;base64,${payload.image}`}
              alt=""
              className="w-full rounded border max-h-48 object-contain bg-muted"
            />

            <div className="space-y-2">
              <Label htmlFor="figma-target">Cible dans SCOPE</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger id="figma-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NEW_COMPONENT_VALUE}>+ Nouveau composant</SelectItem>
                  {components.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.figmaLink?.groupNodeId === payload.groupNodeId ? ' (déjà lié)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="figma-name">Nom</Label>
              <Input id="figma-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="figma-type">Type</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="figma-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_ITEM_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{TYPE_LABELS[type]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">
              {payload.pins.length} zone(s) d&apos;intérêt taguée(s) dans Figma.
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Coché = supprimer le pin correspondant dans SCOPE. Décoché = le garder (il restera orphelin, sans calque Figma associé).
            </p>
            {pendingResult.orphanedPins.map((pin) => (
              <div key={pin.id} className="flex items-center gap-2">
                <Checkbox
                  id={`orphan-${pin.id}`}
                  checked={pinsToDelete.has(pin.id)}
                  onCheckedChange={() => togglePin(pin.id)}
                />
                <Label htmlFor={`orphan-${pin.id}`} className="font-normal cursor-pointer">
                  {pin.label || `Pin #${pin.number}`}
                </Label>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          {!reviewingOrphans ? (
            <Button onClick={handleImport} disabled={busy || !name.trim()}>
              {busy ? 'Import…' : 'Importer'}
            </Button>
          ) : (
            <Button onClick={handleConfirmOrphans}>Continuer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
