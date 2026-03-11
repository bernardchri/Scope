'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { useState } from 'react';
import SettingsDialog from '@/components/SettingsDialog';

interface ProjectHeaderProps {
  projectName: string;
  onNewElement: () => void;
  onRenameProject: (name: string) => void;
}

export default function ProjectHeader({
  projectName,
  onNewElement,
  onRenameProject,
}: ProjectHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

        <div className="w-24" />

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onNewElement}>
            <Plus className="h-4 w-4 mr-1" />
            Nouvel element
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
