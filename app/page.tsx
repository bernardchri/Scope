'use client';

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore, initPreviousProject, undo, redo } from '@/lib/projectStore';
import { openProjectFile, openProjectFolder, addRecentFile } from '@/lib/persistence';
import { createAutoBackup } from '@/lib/backup';
import HomeScreen from '@/components/HomeScreen';
import ComponentList from '@/components/ComponentList';

export default function Home() {
  const activeProjectId = useProjectStore(state => state.activeProjectId);
  const openProject = useProjectStore(state => state.openProject);
  const closeProject = useProjectStore(state => state.closeProject);

  useEffect(() => {
    const unlisteners: (() => void)[] = [];

    listen<string>('menu-open-file', async (event) => {
      const path = event.payload;

      // Check if it's a folder with scope.json
      let project = null;
      try {
        const isFolder = await invoke<boolean>('is_project_folder', { path });
        if (isFolder) {
          project = await openProjectFolder(path);
        }
      } catch {
        // Not a folder, try as file
      }

      if (!project) {
        project = await openProjectFile(path);
      }

      if (!project) return;
      await createAutoBackup([project]);
      await addRecentFile(project.name, path);
      initPreviousProject(project);
      openProject(project, path);
    }).then(fn => unlisteners.push(fn));

    listen('menu-close-project', () => {
      closeProject();
    }).then(fn => unlisteners.push(fn));

    listen('menu-undo', () => undo()).then(fn => unlisteners.push(fn));
    listen('menu-redo', () => redo()).then(fn => unlisteners.push(fn));

    return () => { unlisteners.forEach(fn => fn()); };
  }, [openProject, closeProject]);

  if (activeProjectId) {
    return <ComponentList projectId={activeProjectId} />;
  }

  return <HomeScreen />;
}
