'use client';

import { useState } from 'react';
import { Component, ScopeItemType, WidgetType } from '@/lib/types';
import { getCategoryLabel, getCategoryColor, getActiveWidgets, ALL_WIDGET_TYPES, WIDGET_LABELS } from '@/lib/categoryHelpers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trash2, Clock, Plus, X } from 'lucide-react';
import ComponentEditForm from './forms/ComponentEditForm';
import ImagePinViewer from './ImagePinViewer';
import NoteWidget from './NoteWidget';
import TaskList from './TaskList';
import ComponentInstanceList from './ComponentInstanceList';

interface ScopeItemDetailProps {
  projectId: string;
  item: Component;
  allComponents: Component[];
  onUpdate: (id: string, updates: Partial<Component>) => void;
  onDelete: () => void;
  onNavigate: (componentId: string) => void;
}

export default function ScopeItemDetail({
  projectId,
  item,
  allComponents,
  onUpdate,
  onDelete,
  onNavigate,
}: ScopeItemDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showWidgetManager, setShowWidgetManager] = useState(false);

  const activeWidgets = getActiveWidgets(item);
  const images = item.images || [];

  function handleSaveEdit(
    name: string,
    description: string,
    category: ScopeItemType,
    estimatedHours?: number,
  ) {
    onUpdate(item.id, {
      name,
      description: description || undefined,
      category,
      estimatedHours,
    });
    setIsEditing(false);
  }

  function toggleWidget(widget: WidgetType) {
    const current = [...activeWidgets];
    const idx = current.indexOf(widget);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(widget);
    }
    onUpdate(item.id, { widgets: current });
  }

  function renderWidget(widget: WidgetType) {
    switch (widget) {
      case 'images':
        return (
          <ImagePinViewer
            key="images"
            images={images}
            tasks={item.tasks}
            onUpdateImages={(imgs) => onUpdate(item.id, { images: imgs })}
          />
        );
      case 'notes':
        return (
          <NoteWidget
            key="notes"
            content={item.content || ''}
            onSave={(content) => onUpdate(item.id, { content })}
          />
        );
      case 'tasks':
        return (
          <TaskList
            key="tasks"
            projectId={projectId}
            componentId={item.id}
            tasks={item.tasks}
            images={activeWidgets.includes('images') ? images : undefined}
          />
        );
      case 'instances':
        return (
          <ComponentInstanceList
            key="instances"
            projectId={projectId}
            componentId={item.id}
            instances={item.instances}
            allComponents={allComponents}
            images={activeWidgets.includes('images') ? images : undefined}
            onNavigate={onNavigate}
          />
        );
      default:
        return null;
    }
  }

  if (isEditing) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <ComponentEditForm
          name={item.name}
          description={item.description}
          category={item.category}
          estimatedHours={item.estimatedHours}
          onSubmit={handleSaveEdit}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold flex-1">{item.name}</h1>
        <Badge className={getCategoryColor(item.category)}>
          {getCategoryLabel(item.category)}
        </Badge>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          Modifier
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => { if (confirm(`Supprimer "${item.name}" ?`)) onDelete(); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {item.description && (
        <p className="text-muted-foreground italic">{item.description}</p>
      )}

      {item.estimatedHours !== undefined && (
        <p className="text-sm font-medium text-orange-600 flex items-center gap-1">
          <Clock className="h-4 w-4" />
          Estimation : {item.estimatedHours}h
        </p>
      )}

      {/* Widgets */}
      {activeWidgets.map((widget, i) => (
        <div key={widget}>
          {i > 0 && <Separator className="my-6" />}
          {renderWidget(widget)}
        </div>
      ))}

      {/* Widget Manager */}
      <Separator className="my-6" />
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setShowWidgetManager(!showWidgetManager)}
        >
          {showWidgetManager ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          Widgets
        </Button>

        {showWidgetManager && (
          <div className="flex gap-2 mt-2">
            {ALL_WIDGET_TYPES.map((w) => (
              <Button
                key={w}
                variant={activeWidgets.includes(w) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleWidget(w)}
              >
                {WIDGET_LABELS[w]}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
