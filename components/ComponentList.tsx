'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Component, ComponentCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import ComponentSidebar from './ComponentSidebar';
import ComponentGridView from './ComponentGridView';
import ComponentDetailView from './ComponentDetailView';
import DocumentDetailView from './DocumentDetailView'; // 🆕
import ComponentForm from './forms/ComponentForm';

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
  const [isCreating, setIsCreating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeProject = projects.find(p => p.id === projectId);

  if (!activeProject) return null;

  const selectedItem = selectedComponentId
    ? activeProject.components.find(c => c.id === selectedComponentId)
    : null;

  // 🆕 Déterminer si c'est un document ou un composant
  const isDocument = selectedItem?.category === 'document';

  function handleCreateComponent(name: string, description: string, category: ComponentCategory) {
    const newComponent: Component = {
      id: `component-${Date.now()}`,
      name,
      description: description || undefined,
      category,
      instances: [],
      tasks: [],
      // 🆕 Si c'est un document, initialiser content
      ...(category === 'document' && { content: '' })
    };

    addComponent(activeProject.id, newComponent);
    setIsCreating(false);
  }

  function handleDeleteComponent(componentId: string) {
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
    updateComponent(activeProject.id, componentId, updates);
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {sidebarOpen && (
        <div className="w-64 border-r flex-shrink-0 overflow-y-auto">
          <ComponentSidebar
            components={activeProject.components}
            selectedComponentId={selectedComponentId}
            onSelectComponent={setSelectedComponentId}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b p-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? '◀' : '▶'}
            </Button>
            <Button variant="ghost" onClick={() => setActiveProject(null)}>
              ← Retour aux projets
            </Button>
            <h1 className="text-2xl font-bold flex-1">{activeProject.name}</h1>
            <Button onClick={() => setIsCreating(true)}>
              Nouveau composant
            </Button>
          </div>

          {isCreating && (
            <div className="mt-4">
              <ComponentForm
                onSubmit={handleCreateComponent}
                onCancel={() => setIsCreating(false)}
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {selectedItem ? (
            // 🆕 Router vers DocumentDetailView ou ComponentDetailView
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