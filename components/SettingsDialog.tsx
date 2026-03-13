'use client';

import { useState, useEffect } from 'react';
import { getAppSettings, saveAppSettings } from '@/lib/persistence';
import { AppSettings, DEFAULT_APP_SETTINGS } from '@/lib/types';
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

  useEffect(() => {
    if (open) {
      getAppSettings().then(s => {
        setSettings(s);
        setLoaded(true);
      });
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
