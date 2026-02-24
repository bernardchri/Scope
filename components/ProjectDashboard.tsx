'use client';

import { useState } from 'react';
import { Project, Component, ComponentCategory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Clock, CheckSquare, FileText, FileCode, Euro, TriangleAlert } from 'lucide-react';
import { exportProjectPDF } from '@/lib/pdfExport';
import { exportProjectMarkdown } from '@/lib/markdownExport';

interface ProjectDashboardProps {
  project: Project;
  onSelectComponent: (id: string) => void;
  onUpdateProject: (updates: Partial<Project>) => void;
}

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  template:    'Templates',
  navigation:  'Navigation',
  section:     'Sections',
  composition: 'Compositions',
  element:     'Éléments',
  media:       'Médias',
  form:        'Formulaires',
  content:     'Contenus',
  document:    'Documents',
};

const CATEGORY_ORDER: ComponentCategory[] = [
  'template', 'navigation', 'section', 'composition',
  'element', 'media', 'form', 'content', 'document',
];

export default function ProjectDashboard({
  project,
  onSelectComponent,
  onUpdateProject,
}: ProjectDashboardProps) {
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(project.description ?? '');
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateDraft, setRateDraft] = useState(project.hourlyRate?.toString() ?? '');
  const [isEditingCap, setIsEditingCap] = useState(false);
  const [capDraft, setCapDraft] = useState(project.budgetCap?.toString() ?? '');
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingMd, setIsExportingMd] = useState(false);

  async function handleExportPDF() {
    setIsExporting(true);
    try {
      await exportProjectPDF(project);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportMarkdown() {
    setIsExportingMd(true);
    try {
      await exportProjectMarkdown(project);
    } finally {
      setIsExportingMd(false);
    }
  }

  function saveDescription() {
    onUpdateProject({ description: descDraft.trim() || undefined });
    setIsEditingDesc(false);
  }

  function saveRate() {
    const rate = parseFloat(rateDraft);
    onUpdateProject({ hourlyRate: !isNaN(rate) && rate > 0 ? rate : undefined });
    setIsEditingRate(false);
  }

  function saveCap() {
    const cap = parseFloat(capDraft);
    onUpdateProject({ budgetCap: !isNaN(cap) && cap > 0 ? cap : undefined });
    setIsEditingCap(false);
  }

  // Calculs globaux
  const totalHours = project.components.reduce(
    (acc, c) => acc + (c.estimatedHours ?? 0), 0
  );
  const totalCost = project.hourlyRate ? totalHours * project.hourlyRate : null;
  const overBudget = totalCost !== null && project.budgetCap !== undefined && totalCost > project.budgetCap;
  const totalTasks = project.components.reduce(
    (acc, c) => acc + c.tasks.length, 0
  );
  const doneTasks = project.components.reduce(
    (acc, c) => acc + c.tasks.filter(t => t.completed).length, 0
  );

  // Grouper par catégorie
  const grouped = CATEGORY_ORDER.reduce<Record<string, Component[]>>(
    (acc, cat) => {
      const items = project.components.filter(c => c.category === cat);
      if (items.length > 0) acc[cat] = items;
      return acc;
    },
    {}
  );

  return (
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

         {/* Taux horaire */}
      <section className="flex items-center gap-3 text-sm">
        <Euro className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground">Taux horaire :</span>
        {isEditingRate ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={rateDraft}
              onChange={e => setRateDraft(e.target.value)}
              onBlur={saveRate}
              onKeyDown={e => {
                if (e.key === 'Enter') saveRate();
                if (e.key === 'Escape') { setRateDraft(project.hourlyRate?.toString() ?? ''); setIsEditingRate(false); }
              }}
              placeholder="ex: 60"
              min="0"
              step="1"
              className="w-24 border-b border-gray-300 outline-none bg-transparent text-sm"
              autoFocus
            />
            <span className="text-muted-foreground">€/h</span>
          </div>
        ) : (
          <button
            onClick={() => { setRateDraft(project.hourlyRate?.toString() ?? ''); setIsEditingRate(true); }}
            className="hover:text-foreground transition-colors"
          >
            {project.hourlyRate ? (
              <span className="font-semibold">{project.hourlyRate} € HT/h</span>
            ) : (
              <span className="italic text-muted-foreground/50">Définir un taux…</span>
            )}
          </button>
        )}
      </section>

      {/* Plafond budget */}
      <section className="flex items-center gap-3 text-sm">
        <TriangleAlert className={`w-4 h-4 shrink-0 ${overBudget ? 'text-red-500' : 'text-muted-foreground'}`} />
        <span className="text-muted-foreground">Plafond budget :</span>
        {isEditingCap ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={capDraft}
              onChange={e => setCapDraft(e.target.value)}
              onBlur={saveCap}
              onKeyDown={e => {
                if (e.key === 'Enter') saveCap();
                if (e.key === 'Escape') { setCapDraft(project.budgetCap?.toString() ?? ''); setIsEditingCap(false); }
              }}
              placeholder="ex: 2500"
              min="0"
              step="100"
              className="w-28 border-b border-gray-300 outline-none bg-transparent text-sm"
              autoFocus
            />
            <span className="text-muted-foreground">€ HT</span>
          </div>
        ) : (
          <button
            onClick={() => { setCapDraft(project.budgetCap?.toString() ?? ''); setIsEditingCap(true); }}
            className="hover:text-foreground transition-colors"
          >
            {project.budgetCap ? (
              <span className="font-semibold">{project.budgetCap.toLocaleString('fr-FR')} € HT</span>
            ) : (
              <span className="italic text-muted-foreground/50">Définir un plafond…</span>
            )}
          </button>
        )}
        {overBudget && totalCost !== null && project.budgetCap !== undefined && (
          <span className="text-red-600 font-medium flex items-center gap-1">
            Dépassement de {(totalCost - project.budgetCap).toLocaleString('fr-FR')} € HT
          </span>
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
                {CATEGORY_LABELS[cat as ComponentCategory]}
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

         {/* Exports */}
      <div className="flex justify-end gap-2 -mt-4">
        <Button variant="outline" size="sm" onClick={handleExportMarkdown} disabled={isExportingMd}>
          <FileCode className="w-4 h-4 mr-2" />
          {isExportingMd ? 'Génération…' : 'Exporter STORIES.md'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting}>
          <FileText className="w-4 h-4 mr-2" />
          {isExporting ? 'Génération…' : 'Exporter en PDF'}
        </Button>
      </div>
    </div>
  );
}
