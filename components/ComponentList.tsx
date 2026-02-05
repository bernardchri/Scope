'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Component, ComponentCategory } from '@/lib/types';
import ComponentSidebar from './ComponentSidebar';
import ComponentGridView from './ComponentGridView';
import ComponentDetailView from './ComponentDetailView';
import DocumentDetailView from './DocumentDetailView';
import ProjectHeader from './ProjectHeader'; // 🆕
import CreateComponentModal from './modals/CreateComponentModal'; // 🆕

interface ComponentListProps {
  projectId: string;
}

export default function ComponentList({ projectId }: ComponentListProps) {
  const projects = useProjectStore(state => state.projects);
  const setActiveProject = useProjectStore(state => state.setActiveProject);
  const addComponent = useProjectStore(state => state.addComponent);
  const deleteComponent = useProjectStore(state => state.deleteComponent);
  const updateComponent = useProjectStore(state => state.updateComponent);
  const canDeleteComponent = useProjectStore(state => state.canDeleteComponent);

  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // 🆕
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeProject = projects.find(p => p.id === projectId);

  if (!activeProject) return null;

  const selectedItem = selectedComponentId
    ? activeProject.components.find(c => c.id === selectedComponentId)
    : null;

  const isDocument = selectedItem?.category === 'document';

  function handleCreateComponent(name: string, description: string, category: ComponentCategory) {
    if (!activeProject) return;

    const newComponent: Component = {
      id: `component-${Date.now()}`,
      name,
      description: description || undefined,
      category,
      instances: [],
      tasks: [],
      ...(category === 'document' && { content: '' })
    };

    addComponent(activeProject.id, newComponent);
    setIsModalOpen(false); // 🆕 Fermer la modale
  }

  function handleDeleteComponent(componentId: string) {
    if (!activeProject) return;
    
    if (!canDeleteComponent(activeProject.id, componentId)) {
      const usages = activeProject.components.filter(c =>
        c.instances.some(i => i.componentId === componentId)
      );
      alert(`Impossible de supprimer ce composant, il est utilisé dans ${usages.length} composant(s) : ${usages.map(c => c.name).join(', ')}`);
      return;
    }

    if (selectedComponentId === componentId) {
      setSelectedComponentId(null);
    }

    deleteComponent(activeProject.id, componentId);
  }

  function handleUpdateComponent(componentId: string, updates: Partial<Component>) {
    if (!activeProject) return;
    updateComponent(activeProject.id, componentId, updates);
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {/* 🆕 Header fixe en haut */}
      <ProjectHeader
        projectName={activeProject.name}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onBack={() => setActiveProject(null)}
        onNewComponent={() => setIsModalOpen(true)}
      />

      {/* 🆕 Modale de création */}
      <CreateComponentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleCreateComponent}
      />

      {/* Contenu principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-64 border-r flex-shrink-0 overflow-y-auto">
            <ComponentSidebar
              components={activeProject.components}
              selectedComponentId={selectedComponentId}
              onSelectComponent={setSelectedComponentId}
            />
          </div>
        )}

        {/* Zone de contenu */}
        <div className="flex-1 overflow-y-auto p-8">
          {selectedItem ? (
            isDocument ? (
              <DocumentDetailView
                projectId={projectId}
                document={selectedItem}
                onUpdate={handleUpdateComponent}
                onBack={() => setSelectedComponentId(null)}
              />
            ) : (
              <ComponentDetailView
                projectId={projectId}
                component={selectedItem}
                allComponents={activeProject.components}
                onUpdate={handleUpdateComponent}
                onBack={() => setSelectedComponentId(null)}
              />
            )
          ) : (
            <>
              {activeProject.components.length === 0 ? (
                <p className="text-muted-foreground">Aucun composant</p>
              ) : (
                <ComponentGridView
                  components={activeProject.components}
                  canDeleteComponent={(id) => canDeleteComponent(activeProject.id, id)}
                  onSelectComponent={setSelectedComponentId}
                  onDeleteComponent={handleDeleteComponent}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}