'use client';

import { useCallback, useState } from 'react';
import { useProjectStore, undo, redo } from '@/lib/projectStore';
import { Component, ScopeItemType } from '@/lib/types';
import { useShortcuts } from '@/lib/hooks/useShortcuts';
import ComponentSidebar from './ComponentSidebar';
import ScopeItemDetail from './ScopeItemDetail';
import ProjectHeader from './ProjectHeader';
import ProjectDashboard from './ProjectDashboard';
import CreateComponentModal from './modals/CreateComponentModal';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen } from 'lucide-react';

interface ComponentListProps {
  projectId: string;
}

export default function ComponentList({ projectId }: ComponentListProps) {
  const projects = useProjectStore(state => state.projects);
  const currentProjectPath = useProjectStore(state => state.currentProjectPath);
  const updateProject = useProjectStore(state => state.updateProject);
  const addComponent = useProjectStore(state => state.addComponent);
  const deleteComponent = useProjectStore(state => state.deleteComponent);
  const updateComponent = useProjectStore(state => state.updateComponent);
  const reorderComponents = useProjectStore(state => state.reorderComponents);
  const duplicateComponent = useProjectStore(state => state.duplicateComponent);
  const canDeleteComponent = useProjectStore(state => state.canDeleteComponent);

  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeProject = projects.find(p => p.id === projectId);

  useShortcuts({
    'new-element': useCallback(() => setIsModalOpen(true), []),
    'undo': useCallback(() => undo(), []),
    'redo': useCallback(() => redo(), []),
  });

  if (!activeProject) return null;

  const selectedComponentId = navHistory.length > 0 ? navHistory[navHistory.length - 1] : null;
  const canGoBack = navHistory.length > 1;

  function selectFromSidebar(id: string | null) {
    setNavHistory(id ? [id] : []);
  }

  function navigateTo(id: string) {
    setNavHistory(prev => [...prev, id]);
  }

  function navigateBack() {
    setNavHistory(prev => prev.slice(0, -1));
  }

  const selectedItem = selectedComponentId
    ? activeProject.components.find(c => c.id === selectedComponentId)
    : null;

  const showingDashboard = !selectedComponentId;

  function handleCreateComponent(name: string, description: string, category: ScopeItemType) {
    if (!activeProject) return;
    const newComponent: Component = {
      id: crypto.randomUUID(),
      name,
      description: description || undefined,
      category,
      instances: [],
      tasks: [],
    };
    addComponent(activeProject.id, newComponent);
    setIsModalOpen(false);
    setNavHistory([newComponent.id]);
  }

  function handleDeleteComponent(componentId: string) {
    if (!activeProject) return;
    if (!canDeleteComponent(activeProject.id, componentId)) {
      const usages = activeProject.components.filter(c =>
        c.instances.some(i => i.componentId === componentId)
      );
      alert(`Impossible de supprimer, utilisé dans : ${usages.map(c => c.name).join(', ')}`);
      return;
    }
    if (selectedComponentId === componentId) setNavHistory([]);
    deleteComponent(activeProject.id, componentId);
  }

  function handleDuplicateComponent(componentId: string) {
    if (!activeProject) return;
    const newId = duplicateComponent(activeProject.id, componentId);
    if (newId) setNavHistory([newId]);
  }

  function handleUpdateComponent(componentId: string, updates: Partial<Component>) {
    if (!activeProject) return;
    updateComponent(activeProject.id, componentId, updates);
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <ProjectHeader
        projectName={activeProject.name}
        onNewElement={() => setIsModalOpen(true)}
        onRenameProject={(name) => updateProject(activeProject.id, { name })}
      />

      <CreateComponentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleCreateComponent}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {sidebarOpen ? (
          <div className="w-64 border-r shrink-0 overflow-y-auto">
            <ComponentSidebar
              components={activeProject.components}
              selectedComponentId={selectedComponentId}
              showingDashboard={showingDashboard}
              onSelectComponent={selectFromSidebar}
              onReorderComponents={(ids) => reorderComponents(activeProject.id, ids)}
              onGoHome={() => setNavHistory([])}
              onToggleSidebar={() => setSidebarOpen(false)}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            title="Afficher la sidebar"
            className="absolute top-3 left-3 z-10"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}

        {selectedItem ? (
          <div className="flex-1 overflow-y-auto p-8">
              <ScopeItemDetail
                key={selectedItem.id}
                projectId={projectId}
                item={selectedItem}
                allComponents={activeProject.components}
                folderPath={currentProjectPath || ''}
                onUpdate={handleUpdateComponent}
                onDelete={() => handleDeleteComponent(selectedItem.id)}
                onDuplicate={() => handleDuplicateComponent(selectedItem.id)}
                onNavigate={navigateTo}
              />
          </div>
        ) : (
          <ProjectDashboard
            project={activeProject}
            folderPath={currentProjectPath || ''}
            onSelectComponent={(id) => setNavHistory([id])}
            onUpdateProject={(updates) => updateProject(activeProject.id, updates)}
            className="flex-1 min-h-0"
          />
        )}
      </div>
    </div>
  );
}
