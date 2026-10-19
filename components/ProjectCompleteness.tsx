'use client';

import { useState } from 'react';
import { ChevronRight, TriangleAlert } from 'lucide-react';
import { Project } from '@/lib/types';
import { findCompletenessIssues } from '@/lib/completeness';

interface ProjectCompletenessProps {
  project: Project;
  onSelectComponent: (id: string) => void;
  onOpenCollection: (id: string) => void;
}

/** « À compléter » : pins non précisés et modèle de contenu incomplet, avec accès direct à l'élément concerné. */
export default function ProjectCompleteness({ project, onSelectComponent, onOpenCollection }: ProjectCompletenessProps) {
  const issues = findCompletenessIssues(project);
  const [showInfo, setShowInfo] = useState(false);
  if (issues.length === 0) return null;

  const warnings = issues.filter((i) => i.level === 'warning');
  const infos = issues.filter((i) => i.level === 'info');
  const visible = showInfo ? issues : warnings;

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
        <TriangleAlert className="h-3.5 w-3.5 text-amber-600" />
        À compléter ({warnings.length})
      </h3>
      <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
        {visible.map((issue) => (
          <button
            key={issue.id}
            onClick={() => (issue.componentId ? onSelectComponent(issue.componentId) : issue.collectionId && onOpenCollection(issue.collectionId))}
            className="flex items-center gap-3 px-4 py-2.5 bg-card hover:bg-accent transition-colors text-left text-sm"
          >
            <span className={issue.level === 'warning' ? 'flex-1' : 'flex-1 text-muted-foreground'}>{issue.message}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
      {infos.length > 0 && (
        <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowInfo((v) => !v)}>
          {showInfo ? 'Masquer' : 'Afficher'} {infos.length} information{infos.length > 1 ? 's' : ''}
        </button>
      )}
    </section>
  );
}
