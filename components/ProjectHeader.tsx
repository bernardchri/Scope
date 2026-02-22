'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface ProjectHeaderProps {
  projectName: string;
  onNewComponent: () => void;
  onNewDocument: () => void;
  onRenameProject: (name: string) => void;
}

export default function ProjectHeader({
  projectName,
  onNewComponent,
  onNewDocument,
  onRenameProject,
}: ProjectHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  function startEditing() {
    setDraft(projectName);
    setIsEditing(true);
  }

  function save() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== projectName) onRenameProject(trimmed);
    setIsEditing(false);
  }

  function cancel() {
    setDraft(projectName);
    setIsEditing(false);
  }

  return (
    <div className="border-b bg-white shadow-sm">
      <div className="relative flex items-center justify-between px-4 py-3">
        {/* Centre : Nom du projet (éditable) */}
        <div className="absolute left-1/2 -translate-x-1/2">
          {isEditing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={e => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') cancel();
              }}
              className="text-xl font-bold text-center border-b-2 border-blue-500 outline-none bg-transparent w-64"
            />
          ) : (
            <button
              onClick={startEditing}
              className="text-xl font-bold hover:text-muted-foreground transition-colors"
              title="Cliquer pour renommer"
            >
              {projectName}
            </button>
          )}
        </div>

        {/* Gauche : espace réservé pour aligner le centre */}
        <div className="w-24" />

        {/* Droite : Nouveau document + Nouveau composant */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onNewDocument}>
            <FileText className="h-4 w-4 mr-2" />
            Document
          </Button>
          <Button size="sm" onClick={onNewComponent}>
            Nouveau composant
          </Button>
        </div>
      </div>
    </div>
  );
}
