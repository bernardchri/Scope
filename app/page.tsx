'use client';

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useProjectStore, initPreviousProject } from '@/lib/projectStore';
import { openProjectFile, addRecentFile } from '@/lib/persistence';
import { createAutoBackup } from '@/lib/backup';
import HomeScreen from '@/components/HomeScreen';
import ComponentList from '@/components/ComponentList';
import ComponentDetail from '@/components/ComponentDetail';

export default function Home() {
  const activeProjectId = useProjectStore(state => state.activeProjectId);
  const activeComponentId = useProjectStore(state => state.activeComponentId);
  const openProject = useProjectStore(state => state.openProject);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<string>('menu-open-file', async (event) => {
      const path = event.payload;
      const project = await openProjectFile(path);
      if (!project) return;
      await createAutoBackup([project]);
      await addRecentFile(project.name, path);
      initPreviousProject(project);
      openProject(project, path);
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [openProject]);

  if (activeProjectId && activeComponentId) {
    return <ComponentDetail projectId={activeProjectId} componentId={activeComponentId} />;
  }

  if (activeProjectId) {
    return <ComponentList projectId={activeProjectId} />;
  }

  return <HomeScreen />;
}
