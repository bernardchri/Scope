'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Component, ComponentCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import ComponentCard from './molecules/ComponentCard';
import ComponentForm from './forms/ComponentForm';

interface ComponentListProps {
  projectId: string;
}

export default function ComponentList({ projectId }: ComponentListProps) {
  const projects = useProjectStore(state => state.projects);
  const setActiveProject = useProjectStore(state => state.setActiveProject);
  const setActiveComponent = useProjectStore(state => state.setActiveComponent);
  const addComponent = useProjectStore(state => state.addComponent);
  const deleteComponent = useProjectStore(state => state.deleteComponent);
  const canDeleteComponent = useProjectStore(state => state.canDeleteComponent);

  const [isCreating, setIsCreating] = useState(false);

  const activeProject = projects.find(p => p.id === projectId);

  if (!activeProject) return null;

  function handleCreateComponent(name: string, description: string, category: ComponentCategory) {
    const newComponent: Component = {
      id: `component-${Date.now()}`,
      name,
      description: description || undefined,
      category,
      instances: [],
      tasks: []
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
    deleteComponent(activeProject.id, componentId);
  }

  return (
    <div className="p-8 space-y-6">
      <Button variant="ghost" onClick={() => setActiveProject(null)}>
        ← Retour aux projets
      </Button>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{activeProject.name}</h1>
        <Button onClick={() => setIsCreating(true)}>
          Nouveau composant
        </Button>
      </div>

      {isCreating && (
        <ComponentForm
          onSubmit={handleCreateComponent}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {activeProject.components.length === 0 ? (
        <p className="text-gray-500">Aucun composant</p>
      ) : (
        <div className="grid gap-4">
          {activeProject.components.map(component => {
            const usageCount = activeProject.components.reduce(
              (count, c) => count + c.instances.filter(i => i.componentId === component.id).length,
              0
            );

            return (
              <ComponentCard
                key={component.id}
                component={component}
                usageCount={usageCount}
                canDelete={canDeleteComponent(activeProject.id, component.id)}
                onSelect={() => setActiveComponent(component.id)}
                onDelete={() => handleDeleteComponent(component.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}