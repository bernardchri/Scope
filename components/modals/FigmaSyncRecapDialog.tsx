import { Component, ScopeItemType } from '@/lib/types';
import { FigmaFieldDiff, SYNC_FIELD_LABELS } from '@/lib/figmaImport';
import { TYPE_LABELS } from '@/lib/categoryHelpers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface SyncRecapEntry {
  componentId: string;
  name: string;
  diffs: FigmaFieldDiff[];
}

interface FigmaSyncRecapDialogProps {
  entries: SyncRecapEntry[];
  onApply: (componentId: string, updates: Partial<Component>) => void;
  onDismiss: (componentId: string) => void;
  onClose: () => void;
}

const display = (d: FigmaFieldDiff, value: string) =>
  d.field === 'category' ? TYPE_LABELS[value as ScopeItemType] ?? value : value;

/** Récap d'un envoi groupé : champs SCOPE conservés alors que Figma diffère, applicables un par un. */
export default function FigmaSyncRecapDialog({ entries, onApply, onDismiss, onClose }: FigmaSyncRecapDialogProps) {
  return (
    <Dialog open={entries.length > 0} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Différences avec Figma ignorées</DialogTitle>
          <DialogDescription>
            L&apos;envoi groupé a conservé les valeurs de SCOPE. Remplace-les par celles de Figma si besoin.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 min-h-0 overflow-y-auto py-2">
          {entries.map((entry) => (
            <div key={entry.componentId} className="space-y-2 rounded border p-3">
              <p className="text-sm font-medium">{entry.name}</p>
              {entry.diffs.map((d) => (
                <div key={d.field} className="flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <span className="font-medium">{SYNC_FIELD_LABELS[d.field]}</span>
                    <span className="block text-muted-foreground truncate">SCOPE : {display(d, d.scope)}</span>
                    <span className="block truncate">Figma : {display(d, d.figma)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onApply(entry.componentId, d.field === 'category'
                        ? { category: d.figma as ScopeItemType }
                        : { [d.field]: d.figma });
                    }}
                  >
                    Utiliser Figma
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => onDismiss(entry.componentId)}>Garder SCOPE</Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
