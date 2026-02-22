'use client';

import { useState } from 'react';
import { Project, Component, ComponentCategory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Clock, CheckSquare, FileText } from 'lucide-react';
import { exportProjectPDF } from '@/lib/pdfExport';

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
  const [isExporting, setIsExporting] = useState(false);

  async function handleExportPDF() {
    setIsExporting(true);
    try {
      await exportProjectPDF(project);
    } finally {
      setIsExporting(false);
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

      {/* Export PDF */}
      <div className="flex justify-end -mt-4">
        <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting}>
          <FileText className="w-4 h-4 mr-2" />
          {isExporting ? 'Génération…' : 'Exporter en PDF'}
        </Button>
      </div>

      {/* Statistiques globales */}
      <section className="flex gap-6 border-y py-5">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-lg">{totalHours}h</span>
          <span className="text-muted-foreground">estimées</span>
        </div>
        <div className="w-px bg-border" />
        <div className="flex items-center gap-2 text-sm">
          <CheckSquare className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-lg">{doneTasks}/{totalTasks}</span>
          <span className="text-muted-foreground">tâches complétées</span>
        </div>
        <div className="w-px bg-border" />
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-lg">{project.components.length}</span>
          <span className="text-muted-foreground">composant{project.components.length > 1 ? 's' : ''}</span>
        </div>
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
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-medium truncate">{component.name}</span>
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
                          <Badge
                            variant="secondary"
                            className={`text-xs ${done === total ? 'bg-green-100 text-green-700' : ''}`}
                          >
                            {done}/{total}
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
  );
}
