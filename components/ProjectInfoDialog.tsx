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
  const [deposit, setDeposit] = useState('');
  const [delay, setDelay] = useState('');
  const [validity, setValidity] = useState('');

  useEffect(() => {
    // Recharge le formulaire à l'ouverture depuis l'état projet courant.
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setVersion(project.version ?? '');
    setClient(project.client ?? {});
    setDeposit(project.depositPercent?.toString() ?? '');
    setDelay(project.estimatedDelay ?? '');
    setValidity(project.quoteValidityDays?.toString() ?? '');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, project.version, project.client, project.depositPercent, project.estimatedDelay, project.quoteValidityDays]);

  function handleSave() {
    const trimmedClient: ClientInfo = {
      name: client.name?.trim() || undefined,
      url: client.url?.trim() || undefined,
      contact: client.contact?.trim() || undefined,
    };
    const hasClient = Object.values(trimmedClient).some(Boolean);
    const depositNum = parseFloat(deposit);
    const validityNum = parseInt(validity, 10);
    onUpdateProject({
      version: version.trim() || undefined,
      client: hasClient ? trimmedClient : undefined,
      depositPercent: !isNaN(depositNum) && depositNum > 0 ? depositNum : undefined,
      estimatedDelay: delay.trim() || undefined,
      quoteValidityDays: !isNaN(validityNum) && validityNum > 0 ? validityNum : undefined,
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

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Conditions du devis</Label>
            <div className="space-y-2">
              <Label htmlFor="deposit" className="font-normal">Acompte à la commande (%)</Label>
              <Input
                id="deposit"
                type="number"
                min="0"
                max="100"
                value={deposit}
                onChange={e => setDeposit(e.target.value)}
                placeholder="ex : 30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delay" className="font-normal">Délai indicatif</Label>
              <Input
                id="delay"
                value={delay}
                onChange={e => setDelay(e.target.value)}
                placeholder="ex : 6 à 8 semaines"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validity" className="font-normal">Validité du devis (jours)</Label>
              <Input
                id="validity"
                type="number"
                min="0"
                value={validity}
                onChange={e => setValidity(e.target.value)}
                placeholder="ex : 30"
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
