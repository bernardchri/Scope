'use client';

import { useProjectStore } from '@/lib/projectStore';
import HomeScreen from '@/components/HomeScreen';
import ComponentList from '@/components/ComponentList';
import ComponentDetail from '@/components/ComponentDetail';

export default function Home() {
  const activeProjectId = useProjectStore(state => state.activeProjectId);
  const activeComponentId = useProjectStore(state => state.activeComponentId);

  if (activeProjectId && activeComponentId) {
    return <ComponentDetail projectId={activeProjectId} componentId={activeComponentId} />;
  }

  if (activeProjectId) {
    return <ComponentList projectId={activeProjectId} />;
  }

  return <HomeScreen />;
}
