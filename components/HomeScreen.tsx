'use client';

import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import {
  getRecentFiles,
  addRecentFile,
  openProjectFile,
  createNewProjectFile,
  RecentFile
} from '@/lib/persistence';
import { createAutoBackup } from '@/lib/backup';
import { useProjectStore, initPreviousProject } from '@/lib/projectStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderOpen, Plus, Clock, ChevronRight } from 'lucide-react';

export default function HomeScreen() {
  const openProject = useProjectStore(state => state.openProject);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    getRecentFiles().then(setRecentFiles);
  }, []);

  async function handleOpenPath(path: string) {
    const project = await openProjectFile(path);
    if (!project) return;

    await createAutoBackup([project]);
    await addRecentFile(project.name, path);
    setRecentFiles(await getRecentFiles());

    initPreviousProject(project);
    openProject(project, path);
  }

  async function handleOpenFile() {
    const filePath = await open({
      multiple: false,
      filters: [{ name: 'SCOPE Files', extensions: ['scope'] }]
    });
    if (!filePath || typeof filePath !== 'string') return;
    await handleOpenPath(filePath);
  }

  async function handleCreate() {
    const name = newProjectName.trim();
    if (!name) return;

    const result = await createNewProjectFile(name);
    if (!result) return;

    await addRecentFile(result.project.name, result.path);
    setRecentFiles(await getRecentFiles());

    initPreviousProject(result.project);
    openProject(result.project, result.path);
    setIsCreating(false);
    setNewProjectName('');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-10 p-8">

      {/* Titre */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-1">SCOPE</h1>
        <p className="text-muted-foreground text-sm">Cadrage et planification de projets web</p>
      </div>

      {/* Récents */}
      {recentFiles.length > 0 && (
        <div className="w-full max-w-sm space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Récents
          </p>
          <div className="flex flex-col gap-1">
            {recentFiles.map(file => (
              <button
                key={file.path}
                onClick={() => handleOpenPath(file.path)}
                className="group flex items-center justify-between px-4 py-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{file.path}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        {isCreating ? (
          <div className="space-y-2">
            <Input
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              placeholder="Nom du projet"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setIsCreating(false); setNewProjectName(''); }
              }}
            />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCreate} disabled={!newProjectName.trim()}>
                Créer et choisir l'emplacement
              </Button>
              <Button variant="outline" onClick={() => { setIsCreating(false); setNewProjectName(''); }}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button size="lg" className="w-full" onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau projet
            </Button>
            <Button size="lg" variant="outline" className="w-full" onClick={handleOpenFile}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Ouvrir un fichier .scope
            </Button>
          </div>
        )}
      </div>

    </div>
  );
}
