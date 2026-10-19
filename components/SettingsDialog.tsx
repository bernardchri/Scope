'use client';

import { useState, useEffect } from 'react';
import { getAppSettings, saveAppSettings } from '@/lib/persistence';
import { getFigmaBridgeInfo, FigmaBridgeInfo } from '@/lib/figmaBridge';
import { AppSettings, DEFAULT_APP_SETTINGS } from '@/lib/types';
import { SCOPE_ITEM_TYPES, TYPE_LABELS } from '@/lib/categoryHelpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: Props) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [figmaBridge, setFigmaBridge] = useState<FigmaBridgeInfo | null>(null);

  useEffect(() => {
    if (open) {
      getAppSettings().then(s => {
        setSettings(s);
        setLoaded(true);
      });
      getFigmaBridgeInfo().then(setFigmaBridge).catch(() => setFigmaBridge(null));
    }
  }, [open]);

  async function handleSave() {
    await saveAppSettings(settings);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Paramètres</DialogTitle>
          <DialogDescription>
            Options globales de l&apos;application.
          </DialogDescription>
        </DialogHeader>

        {loaded && (
          <div className="space-y-6 py-2">
            <div className="space-y-2">
              <Label htmlFor="studioName">Nom du studio</Label>
              <Input
                id="studioName"
                value={settings.studioName || ''}
                onChange={e =>
                  setSettings({ ...settings, studioName: e.target.value })
                }
                placeholder="Mon Studio"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Estimation par défaut (heures)</Label>
              <p className="text-sm text-muted-foreground">
                Appliquée à la création d&apos;un élément du type correspondant. Vide = aucune.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {SCOPE_ITEM_TYPES.map(type => (
                  <div key={type} className="flex items-center gap-2">
                    <Label htmlFor={`estimate-${type}`} className="w-24 font-normal">
                      {TYPE_LABELS[type]}
                    </Label>
                    <Input
                      id={`estimate-${type}`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={settings.defaultEstimates?.[type] ?? ''}
                      onChange={e => {
                        const next = { ...settings.defaultEstimates };
                        const v = parseFloat(e.target.value);
                        if (Number.isFinite(v) && v > 0) next[type] = v;
                        else delete next[type];
                        setSettings({ ...settings, defaultEstimates: next });
                      }}
                      placeholder="—"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Export PDF</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showEstimations"
                  checked={settings.pdf.showEstimations}
                  onCheckedChange={(checked: boolean) =>
                    setSettings({
                      ...settings,
                      pdf: { ...settings.pdf, showEstimations: !!checked },
                    })
                  }
                />
                <Label htmlFor="showEstimations" className="font-normal cursor-pointer">
                  Afficher les estimations (heures)
                </Label>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Export Markdown</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="markdownMultiFile"
                  checked={settings.markdown.multiFile}
                  onCheckedChange={(checked: boolean) =>
                    setSettings({
                      ...settings,
                      markdown: { ...settings.markdown, multiFile: !!checked },
                    })
                  }
                />
                <Label htmlFor="markdownMultiFile" className="font-normal cursor-pointer">
                  Exporter un fichier par élément
                </Label>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Commentaires</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="exportComments"
                  checked={settings.comment.exportComments}
                  onCheckedChange={(checked: boolean) =>
                    setSettings({
                      ...settings,
                      comment: { ...settings.comment, exportComments: !!checked },
                    })
                  }
                />
                <Label htmlFor="exportComments" className="font-normal cursor-pointer">
                  Inclure les commentaires dans les exports
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Pont Figma (bêta)</Label>
              {figmaBridge && figmaBridge.port !== 0 ? (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Endpoint : <code>http://localhost:{figmaBridge.port}/scope-push</code>
                  </p>
                  <p>
                    Token : <code className="break-all">{figmaBridge.token}</code>
                  </p>
                  <p>À utiliser depuis le futur plugin Figma (en-tête <code>Authorization: Bearer &lt;token&gt;</code>).</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Pont indisponible.</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
