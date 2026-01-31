'use client';

import { useProjectStore } from '@/lib/projectStore';
import ProjectList from '@/components/ProjectList';
import ComponentList from '@/components/ComponentList';
import ComponentDetail from '@/components/ComponentDetail';

export default function Home() {
  const activeProjectId = useProjectStore(state => state.activeProjectId);
  const activeComponentId = useProjectStore(state => state.activeComponentId);

  // Vue détail d'un composant
  if (activeProjectId && activeComponentId) {
    return <ComponentDetail projectId={activeProjectId} componentId={activeComponentId} />;
  }

  // Vue liste des composants
  if (activeProjectId) {
    return <ComponentList projectId={activeProjectId} />;
  }

  // Vue liste des projets
  return <ProjectList />;
}