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

/** Parse un champ numérique optionnel : renvoie `undefined` si vide ou ≤ 0. */
function parseOptionalNumber(raw: string, parser: (s: string) => number): number | undefined {
  const n = parser(raw);
  return !isNaN(n) && n > 0 ? n : undefined;
}

export default function ProjectInfoDialog({ open, onOpenChange, project, onUpdateProject }: Props) {
  const [version, setVersion] = useState('');
  const [client, setClient] = useState<ClientInfo>({});
  const [rate, setRate] = useState('');
  const [cap, setCap] = useState('');
  const [deposit, setDeposit] = useState('');
  const [delay, setDelay] = useState('');
  const [validity, setValidity] = useState('');

  useEffect(() => {
    // Snapshot volontaire de l'état projet à l'ouverture du dialogue uniquement.
    if (!open) return;
    setVersion(project.version ?? '');
    setClient(project.client ?? {});
    setRate(project.hourlyRate?.toString() ?? '');
    setCap(project.budgetCap?.toString() ?? '');
    setDeposit(project.depositPercent?.toString() ?? '');
    setDelay(project.estimatedDelay ?? '');
    setValidity(project.quoteValidityDays?.toString() ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      hourlyRate: parseOptionalNumber(rate, parseFloat),
      budgetCap: parseOptionalNumber(cap, parseFloat),
      depositPercent: parseOptionalNumber(deposit, parseFloat),
      estimatedDelay: delay.trim() || undefined,
      quoteValidityDays: parseOptionalNumber(validity, s => parseInt(s, 10)),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Infos du projet</DialogTitle>
          <DialogDescription>
            Budget, version et infos client — repris sur la page de garde du PDF et le devis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Budget</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate" className="font-normal">Taux horaire (€ HT/h)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  min="0"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  placeholder="ex : 60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetCap" className="font-normal">Plafond budget (€ HT)</Label>
                <Input
                  id="budgetCap"
                  type="number"
                  min="0"
                  step="100"
                  value={cap}
                  onChange={e => setCap(e.target.value)}
                  placeholder="ex : 2500"
                />
              </div>
            </div>
          </div>

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
