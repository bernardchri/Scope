'use client';

import { useState } from 'react';
import type React from 'react';
import { Project, Component, ComponentCategory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Clock, CheckSquare, FileText, FileCode, Euro, TriangleAlert, Pencil } from 'lucide-react';
import ProjectInfoDialog from './ProjectInfoDialog';
import { exportProjectPDF } from '@/lib/pdfExport';
import { exportProjectQuote } from '@/lib/quoteExport';
import { exportProjectMarkdown } from '@/lib/markdownExport';
import { CATEGORY_SECTION_LABELS, COMPONENT_DISPLAY_ORDER } from '@/lib/categoryHelpers';
import { cn } from '@/lib/utils';

interface ProjectDashboardProps {
  project: Project;
  folderPath: string;
  onSelectComponent: (id: string) => void;
  onUpdateProject: (updates: Partial<Project>) => void;
  className?: string;
}

export default function ProjectDashboard({
  project,
  folderPath,
  onSelectComponent,
  onUpdateProject,
  className,
}: ProjectDashboardProps) {
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(project.description ?? '');
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingMd, setIsExportingMd] = useState(false);
  const [isExportingQuote, setIsExportingQuote] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  async function handleExportPDF() {
    setIsExporting(true);
    try {
      await exportProjectPDF(project, folderPath);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportQuote() {
    setIsExportingQuote(true);
    try {
      await exportProjectQuote(project, folderPath);
    } finally {
      setIsExportingQuote(false);
    }
  }

  async function handleExportMarkdown() {
    setIsExportingMd(true);
    try {
      await exportProjectMarkdown(project, folderPath);
    } finally {
      setIsExportingMd(false);
    }
  }

  function saveDescription() {
    onUpdateProject({ description: descDraft.trim() || undefined });
    setIsEditingDesc(false);
  }

  // Calculs globaux
  const totalHours = project.components.reduce(
    (acc, c) => acc + (c.estimatedHours ?? 0), 0
  );
  const totalCost = project.hourlyRate ? totalHours * project.hourlyRate : null;
  const overBudget = totalCost !== null && project.budgetCap !== undefined && totalCost > project.budgetCap;

  // Lignes d'infos affichées en lecture seule (édition via ProjectInfoDialog)
  const clientLine = [project.client?.name, project.client?.url].filter(Boolean).join(' · ');
  const infoRows: { label: string; value: React.ReactNode }[] = [];
  if (clientLine) infoRows.push({ label: 'Client', value: clientLine });
  if (project.client?.contact) infoRows.push({ label: 'Contact', value: project.client.contact });
  if (project.version) infoRows.push({ label: 'Version', value: project.version });
  if (project.hourlyRate) infoRows.push({ label: 'Taux horaire', value: `${project.hourlyRate} € HT/h` });
  if (project.budgetCap) infoRows.push({ label: 'Plafond budget', value: `${project.budgetCap.toLocaleString('fr-FR')} € HT` });
  if (project.depositPercent) infoRows.push({ label: 'Acompte', value: `${project.depositPercent} %` });
  if (project.estimatedDelay) infoRows.push({ label: 'Délai indicatif', value: project.estimatedDelay });
  if (project.quoteValidityDays) infoRows.push({ label: 'Validité du devis', value: `${project.quoteValidityDays} jours` });
  const totalTasks = project.components.reduce(
    (acc, c) => acc + c.tasks.length, 0
  );
  const doneTasks = project.components.reduce(
    (acc, c) => acc + c.tasks.filter(t => t.completed).length, 0
  );

  // Grouper par catégorie
  const grouped = COMPONENT_DISPLAY_ORDER.reduce<Record<string, Component[]>>(
    (acc, cat) => {
      const items = project.components.filter(c => c.category === cat);
      if (items.length > 0) acc[cat] = items;
      return acc;
    },
    {}
  );

  return (
    <div className={cn("flex flex-col", className)}>
    <div className="flex-1 overflow-y-auto">
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-10">

      {/* Description */}
      <section>
        {isEditingDesc ? (
          <div className="space-y-2">
            <textarea
              className="w-full min-h-30 p-3 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={descDraft}
              onChange={e => setDescDraft(e.target.value)}
              placeholder="Décrivez le projet, son contexte, ses objectifs…"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setDescDraft(project.description ?? '');
                  setIsEditingDesc(false);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={saveDescription}
                className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Enregistrer
              </button>
              <button
                onClick={() => { setDescDraft(project.description ?? ''); setIsEditingDesc(false); }}
                className="text-sm px-3 py-1.5 rounded-md border hover:bg-accent"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setDescDraft(project.description ?? ''); setIsEditingDesc(true); }}
            className="w-full text-left group"
          >
            {project.description ? (
              <p className="text-muted-foreground text-sm leading-relaxed group-hover:text-foreground transition-colors">
                {project.description}
              </p>
            ) : (
              <p className="text-muted-foreground/50 text-sm italic group-hover:text-muted-foreground transition-colors">
                Ajouter une description du projet…
              </p>
            )}
          </button>
        )}
      </section>

      {/* Infos du projet (lecture seule — édition via le dialogue) */}
      <section className="rounded-lg border bg-card">
        <div className="flex items-center justify-between px-4 py-2.5 border-b">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Infos du projet
          </span>
          <button
            onClick={() => setIsInfoOpen(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Modifier
          </button>
        </div>

        {infoRows.length === 0 ? (
          <button
            onClick={() => setIsInfoOpen(true)}
            className="w-full text-left px-4 py-3 text-sm text-muted-foreground/60 italic hover:text-muted-foreground transition-colors"
          >
            Renseigner le budget, la version et les infos client…
          </button>
        ) : (
          <dl className="divide-y">
            {infoRows.map(row => (
              <div key={row.label} className="flex gap-4 px-4 py-2 text-sm">
                <dt className="w-40 shrink-0 text-muted-foreground">{row.label}</dt>
                <dd className="flex-1 min-w-0">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {overBudget && totalCost !== null && project.budgetCap !== undefined && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-t text-sm text-red-600 font-medium">
            <TriangleAlert className="w-4 h-4 shrink-0" />
            Dépassement du plafond de {(totalCost - project.budgetCap).toLocaleString('fr-FR')} € HT
          </div>
        )}
      </section>

      {/* Statistiques globales */}
      <section className="flex flex-wrap gap-6 border-y py-5">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-lg">{totalHours}h</span>
          <span className="text-muted-foreground">estimées</span>
        </div>
        <div className="w-px bg-border" />
        <div className="flex items-center gap-2 text-sm">
          <CheckSquare className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-lg">{totalTasks}</span>
          <span className="text-muted-foreground">élément{totalTasks > 1 ? 's' : ''}</span>
        </div>
        <div className="w-px bg-border" />
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-lg">{project.components.length}</span>
          <span className="text-muted-foreground">composant{project.components.length > 1 ? 's' : ''}</span>
        </div>
        {totalCost !== null && (
          <>
            <div className="w-px bg-border" />
            <div className="flex items-center gap-2 text-sm">
              <Euro className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-lg text-green-700">{totalCost.toLocaleString('fr-FR')} € HT</span>
              <span className="text-muted-foreground">estimés</span>
            </div>
          </>
        )}
      </section>



      {/* Listing composants */}
      {project.components.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucun composant pour le moment.</p>
      ) : (
        <section className="space-y-6">
          {Object.entries(grouped).map(([cat, components]) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                {CATEGORY_SECTION_LABELS[cat as ComponentCategory]}
              </h3>
              <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
                {components.map(component => {
                  const done = component.tasks.filter(t => t.completed).length;
                  const total = component.tasks.length;
                  const hours = component.estimatedHours;

                  return (
                    <button
                      key={component.id}
                      onClick={() => onSelectComponent(component.id)}
                      className="flex items-center justify-between px-4 py-3 bg-card hover:bg-accent transition-colors text-left group"
                    >
                      <div className="flex-1 items-center gap-3 min-w-0">
                        <span className="font-medium ">{component.name}</span>
                        {component.description && (
                          <span className="text-xs text-muted-foreground truncate hidden sm:block">
                            {component.description}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        {hours != null && hours > 0 && (
                          <span className="text-xs text-muted-foreground">{hours}h</span>
                        )}
                        {total > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {total}
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

    </div>
    </div>

    <ProjectInfoDialog
      open={isInfoOpen}
      onOpenChange={setIsInfoOpen}
      project={project}
      onUpdateProject={onUpdateProject}
    />

    {/* Footer exports */}
    <div className="shrink-0 border-t bg-background py-3 px-4">
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={handleExportMarkdown} disabled={isExportingMd}>
          <FileCode className="w-4 h-4 mr-2" />
          {isExportingMd ? 'Génération…' : 'Exporter STORIES.md'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting}>
          <FileText className="w-4 h-4 mr-2" />
          {isExporting ? 'Génération…' : 'Exporter en PDF'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportQuote} disabled={isExportingQuote}>
          <Euro className="w-4 h-4 mr-2" />
          {isExportingQuote ? 'Génération…' : 'Exporter le devis'}
        </Button>
      </div>
    </div>
    </div>
  );
}
