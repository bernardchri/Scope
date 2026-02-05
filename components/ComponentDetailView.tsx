'use client';

import { useState } from 'react';
import { Component, ComponentCategory } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import ComponentDetailHeader from './molecules/ComponentDetailHeader';
import ComponentEditForm from './forms/ComponentEditForm';
import TaskList from './TaskList';
import ComponentInstanceList from './ComponentInstanceList';

interface ComponentDetailViewProps {
  projectId: string;
  component: Component;
  allComponents: Component[];
  onUpdate: (componentId: string, updates: Partial<Component>) => void;
  // 🆕 onBack supprimé
}

export default function ComponentDetailView({
  projectId,
  component,
  allComponents,
  onUpdate,
  // 🆕 onBack supprimé
}: ComponentDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);

  function handleSaveEdit(
    name: string,
    description: string,
    category: ComponentCategory,
    imageBase64?: string
  ) {
    onUpdate(component.id, {
      name,
      description: description || undefined,
      category,
      imageBase64
    });
    setIsEditing(false);
  }

  return (
    <div className="space-y-6">
      {isEditing ? (
        <ComponentEditForm
          name={component.name}
          description={component.description}
          category={component.category}
          imageBase64={component.imageBase64}
          onSubmit={handleSaveEdit}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ComponentDetailHeader
          component={component}
          onEdit={() => setIsEditing(true)}
        />
      )}

      <Separator />

      <TaskList
        projectId={projectId}
        componentId={component.id}
        tasks={component.tasks}
      />

      <Separator />

      <ComponentInstanceList
        projectId={projectId}
        componentId={component.id}
        instances={component.instances}
        allComponents={allComponents}
      />
    </div>
  );
}