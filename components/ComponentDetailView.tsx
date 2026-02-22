'use client';

import { useState } from 'react';
import { Component, ComponentCategory, ComponentImage } from '@/lib/types';
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
  onDelete: () => void;
}

export default function ComponentDetailView({
  projectId,
  component,
  allComponents,
  onUpdate,
  onDelete,
}: ComponentDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);

  function handleSaveEdit(
    name: string,
    description: string,
    category: ComponentCategory,
    images: ComponentImage[],
    estimatedHours?: number
  ) {
    onUpdate(component.id, {
      name,
      description: description || undefined,
      category,
      images,
      estimatedHours,
      imageBase64: images.find(img => img.isPrimary)?.base64
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
          estimatedHours={component.estimatedHours}
          imageBase64={component.imageBase64}
          images={component.images}
          onSubmit={handleSaveEdit}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ComponentDetailHeader
          component={component}
          onEdit={() => setIsEditing(true)}
          onDelete={onDelete}
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