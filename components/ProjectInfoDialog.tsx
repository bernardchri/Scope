'use client';

import { useState, useEffect } from 'react';
import { Project, ClientInfo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
}

export default function ProjectInfoDialog({ open, onOpenChange, project, onUpdateProject }: Props) {
  const [version, setVersion] = useState('');
  const [client, setClient] = useState<ClientInfo>({});

  useEffect(() => {
    // Recharge le formulaire à l'ouverture depuis l'état projet courant.
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setVersion(project.version ?? '');
    setClient(project.client ?? {});
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, project.version, project.client]);

  function handleSave() {
    const trimmedClient: ClientInfo = {
      name: client.name?.trim() || undefined,
      url: client.url?.trim() || undefined,
      contact: client.contact?.trim() || undefined,
    };
    const hasClient = Object.values(trimmedClient).some(Boolean);
    onUpdateProject({
      version: version.trim() || undefined,
      client: hasClient ? trimmedClient : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Infos projet &amp; client</DialogTitle>
          <DialogDescription>
            Ces informations apparaissent sur la page de garde du PDF et du devis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="projectVersion">Version du projet</Label>
            <Input
              id="projectVersion"
              value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder="ex : v1.0"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Client</Label>
            <div className="space-y-2">
              <Label htmlFor="clientName" className="font-normal">Nom / société</Label>
              <Input
                id="clientName"
                value={client.name ?? ''}
                onChange={e => setClient({ ...client, name: e.target.value })}
                placeholder="ex : Domaine des Trois Chênes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientUrl" className="font-normal">Site web</Label>
              <Input
                id="clientUrl"
                value={client.url ?? ''}
                onChange={e => setClient({ ...client, url: e.target.value })}
                placeholder="ex : trois-chenes.fr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientContact" className="font-normal">Contact</Label>
              <Input
                id="clientContact"
                value={client.contact ?? ''}
                onChange={e => setClient({ ...client, contact: e.target.value })}
                placeholder="ex : Marie Dupont — marie@trois-chenes.fr"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
