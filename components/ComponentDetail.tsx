'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { ComponentCategory } from '@/lib/types';
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

  const [isEditing, setIsEditing] = useState(false);

  const activeProject = projects.find(p => p.id === projectId);
  const activeComponent = activeProject?.components.find(c => c.id === componentId);

  if (!activeProject || !activeComponent) return null;

  function handleSaveEdit(
    name: string,
    description: string,
    category: ComponentCategory,
    imageBase64?: string
  ) {
    if (!activeProject || !activeComponent) return;

    updateComponent(activeProject.id, activeComponent.id, {
      name,
      description: description || undefined,
      category,
      imageBase64
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
          imageBase64={activeComponent.imageBase64}
          onSubmit={handleSaveEdit}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ComponentDetailHeader
          component={activeComponent}
          onEdit={() => setIsEditing(true)}
        />
      )}

      <Separator />

      <TaskList
        projectId={projectId}
        componentId={componentId}
        tasks={activeComponent.tasks}
      />

      <Separator />

      <ComponentInstanceList
        projectId={projectId}
        componentId={componentId}
        instances={activeComponent.instances}
        allComponents={activeProject.components}
      />
    </div>
  );
}