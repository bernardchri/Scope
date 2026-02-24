'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Component, ComponentCategory } from '@/lib/types';
import ComponentSidebar from './ComponentSidebar';
import ComponentDetailView from './ComponentDetailView';
import DocumentDetailView from './DocumentDetailView';
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
  const updateProject = useProjectStore(state => state.updateProject);
  const addComponent = useProjectStore(state => state.addComponent);
  const deleteComponent = useProjectStore(state => state.deleteComponent);
  const updateComponent = useProjectStore(state => state.updateComponent);
  const reorderComponents = useProjectStore(state => state.reorderComponents);
  const canDeleteComponent = useProjectStore(state => state.canDeleteComponent);

  // Pile de navigation : [composantA, composantB, ...] — le dernier est l'actif
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeProject = projects.find(p => p.id === projectId);
  if (!activeProject) return null;

  const selectedComponentId = navHistory.length > 0 ? navHistory[navHistory.length - 1] : null;
  const canGoBack = navHistory.length > 1;

  // Sélection depuis la sidebar : réinitialise la pile
  function selectFromSidebar(id: string | null) {
    setNavHistory(id ? [id] : []);
  }

  // Navigation vers un composant lié : empile
  function navigateTo(id: string) {
    setNavHistory(prev => [...prev, id]);
  }

  // Retour arrière : dépile
  function navigateBack() {
    setNavHistory(prev => prev.slice(0, -1));
  }

  const selectedItem = selectedComponentId
    ? activeProject.components.find(c => c.id === selectedComponentId)
    : null;

  const isDocument = selectedItem?.category === 'document';
  const showingDashboard = !selectedComponentId;

  function handleCreateComponent(name: string, description: string, category: ComponentCategory) {
    if (!activeProject) return;
    const newComponent: Component = {
      id: crypto.randomUUID(),
      name,
      description: description || undefined,
      category,
      instances: [],
      tasks: [],
      ...(category === 'document' && { content: '' })
    };
    addComponent(activeProject.id, newComponent);
    setIsModalOpen(false);
    setIsDocumentModalOpen(false);
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

  function handleUpdateComponent(componentId: string, updates: Partial<Component>) {
    if (!activeProject) return;
    updateComponent(activeProject.id, componentId, updates);
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <ProjectHeader
        projectName={activeProject.name}
        onNewComponent={() => setIsModalOpen(true)}
        onNewDocument={() => setIsDocumentModalOpen(true)}
        onRenameProject={(name) => updateProject(activeProject.id, { name })}
      />

      <CreateComponentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleCreateComponent}
      />
      <CreateComponentModal
        open={isDocumentModalOpen}
        onOpenChange={setIsDocumentModalOpen}
        onSubmit={handleCreateComponent}
        isDocument
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

        <div className="flex-1 overflow-y-auto">
          {selectedItem ? (
            <div className="p-8">
              {isDocument ? (
                <DocumentDetailView
                  key={selectedItem.id}
                  projectId={projectId}
                  document={selectedItem}
                  allComponents={activeProject.components}
                  onUpdate={handleUpdateComponent}
                  onDelete={() => handleDeleteComponent(selectedItem.id)}
                  onNavigate={navigateTo}
                />
              ) : (
                <ComponentDetailView
                  key={selectedItem.id}
                  projectId={projectId}
                  component={selectedItem}
                  allComponents={activeProject.components}
                  onUpdate={handleUpdateComponent}
                  onDelete={() => handleDeleteComponent(selectedItem.id)}
                  onBack={canGoBack ? navigateBack : undefined}
                  onNavigate={navigateTo}
                />
              )}
            </div>
          ) : (
            <ProjectDashboard
              project={activeProject}
              onSelectComponent={(id) => setNavHistory([id])}
              onUpdateProject={(updates) => updateProject(activeProject.id, updates)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
