'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { ComponentCategory, ComponentImage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import ComponentDetailHeader from './molecules/ComponentDetailHeader';
import ComponentEditForm from './forms/ComponentEditForm';
import TaskList from './TaskList';
import ComponentInstanceList from './ComponentInstanceList';

interface ComponentDetailProps {
  projectId: string;
  componentId: string;
}

export default function ComponentDetail({ projectId, componentId }: ComponentDetailProps) {
  const projects = useProjectStore(state => state.projects);
  const setActiveComponent = useProjectStore(state => state.setActiveComponent);
  const updateComponent = useProjectStore(state => state.updateComponent);
  const deleteComponent = useProjectStore(state => state.deleteComponent);
  const canDeleteComponent = useProjectStore(state => state.canDeleteComponent);

  const [isEditing, setIsEditing] = useState(false);

  const activeProject = projects.find(p => p.id === projectId);
  const activeComponent = activeProject?.components.find(c => c.id === componentId);

  if (!activeProject || !activeComponent) return null;

  function handleSaveEdit(
    name: string,
    description: string,
    category: ComponentCategory,
    images: ComponentImage[],
    estimatedHours?: number
  ) {
    if (!activeProject || !activeComponent) return;

    updateComponent(activeProject.id, activeComponent.id, {
      name,
      description: description || undefined,
      category,
      images,
      estimatedHours
    });
    setIsEditing(false);
  }

  return (
    <div className="p-8 space-y-6">
      <Button variant="ghost" onClick={() => setActiveComponent(null)}>
        ← Retour au projet {activeProject.name}
      </Button>

      {isEditing ? (
        <ComponentEditForm
          name={activeComponent.name}
          description={activeComponent.description}
          category={activeComponent.category}
          images={activeComponent.images}
          estimatedHours={activeComponent.estimatedHours}
          onSubmit={handleSaveEdit} 
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ComponentDetailHeader
          component={activeComponent}
          tasks={activeComponent.tasks}
          onUpdateImages={(images) => updateComponent(activeProject.id, activeComponent.id, { images })}
          onBack={() => setActiveComponent(null)}
          onEdit={() => setIsEditing(true)}
          onDelete={() => {
            if (!confirm(`Supprimer "${activeComponent.name}" ?`)) return;
            if (!canDeleteComponent(activeProject.id, activeComponent.id)) {
              const usages = activeProject.components.filter(c =>
                c.instances.some(i => i.componentId === activeComponent.id)
              );
              alert(`Impossible de supprimer, utilisé dans : ${usages.map(c => c.name).join(', ')}`);
              return;
            }
            deleteComponent(activeProject.id, activeComponent.id);
            setActiveComponent(null);
          }}
        />
      )}

      <Separator />

      <TaskList
        projectId={projectId}
        componentId={componentId}
        tasks={activeComponent.tasks}
        images={activeComponent.images ?? []}
      />

      <Separator />

      <ComponentInstanceList
        projectId={projectId}
        componentId={componentId}
        instances={activeComponent.instances}
        allComponents={activeProject.components}
        onNavigate={(id) => setActiveComponent(id)}
      />
    </div>
  );
}