'use client';

import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import {
  getRecentFiles,
  addRecentFile,
  removeRecentFile,
  openProjectFolder,
  isProjectFolder,
  createNewProjectFolder,
  RecentFile
} from '@/lib/persistence';
import { createAutoBackup } from '@/lib/backup';
import { useProjectStore, initPreviousProject } from '@/lib/projectStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FolderOpen, Plus, Clock, ChevronRight, Settings } from 'lucide-react';
import SettingsDialog from '@/components/SettingsDialog';

export default function HomeScreen() {
  const openProject = useProjectStore(state => state.openProject);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [missingFile, setMissingFile] = useState<RecentFile | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    getRecentFiles().then(setRecentFiles);
  }, []);

  async function handleOpenPath(path: string, recentFile?: RecentFile) {
    const project = await openProjectFolder(path);
    if (!project) {
      if (recentFile) {
        await removeRecentFile(path);
        setRecentFiles(await getRecentFiles());
        setMissingFile(recentFile);
      }
      return;
    }

    await createAutoBackup([project]);
    await addRecentFile(project.name, path);
    setRecentFiles(await getRecentFiles());

    initPreviousProject(project);
    openProject(project, path);
  }

  async function handleOpenFolder() {
    const folderPath = await open({
      multiple: false,
      directory: true,
    });
    if (!folderPath || typeof folderPath !== 'string') return;

    if (!(await isProjectFolder(folderPath))) {
      alert('Ce dossier ne contient pas de projet SCOPE (scope.json introuvable).');
      return;
    }
    await handleOpenPath(folderPath);
  }

  async function handleCreate() {
    const name = newProjectName.trim();
    if (!name) return;

    const result = await createNewProjectFolder(name);
    if (!result) return;

    await addRecentFile(result.project.name, result.path);
    setRecentFiles(await getRecentFiles());

    initPreviousProject(result.project);
    openProject(result.project, result.path);
    setIsCreating(false);
    setNewProjectName('');
  }

  return (
    <>
    <div className="flex flex-col items-center justify-center min-h-screen gap-10 p-8 relative">

      {/* Bouton paramètres */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4"
        onClick={() => setSettingsOpen(true)}
      >
        <Settings className="w-5 h-5" />
      </Button>

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
                onClick={() => handleOpenPath(file.path, file)}
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
                Créer et choisir l&apos;emplacement
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
            <Button size="lg" variant="outline" className="w-full" onClick={handleOpenFolder}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Ouvrir un projet
            </Button>
          </div>
        )}
      </div>

    </div>

    {/* Modal fichier introuvable */}
    <Dialog open={!!missingFile} onOpenChange={() => setMissingFile(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fichier introuvable</DialogTitle>
          <DialogDescription>
            Le fichier <span className="font-medium text-foreground">{missingFile?.name}</span> est introuvable à l&apos;emplacement suivant :
            <br />
            <span className="text-xs text-muted-foreground break-all">{missingFile?.path}</span>
            <br /><br />
            Il a été retiré de la liste des fichiers récents.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setMissingFile(null)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
