'use client';

import { useState } from 'react';
import { Component, ScopeItemType, WidgetType, WidgetInstance } from '@/lib/types';
import { getCategoryLabel, getCategoryColor, getActiveWidgets, getAvailableWidgetTypes, WIDGET_LABELS, WIDGET_ICONS, widgetHasContent } from '@/lib/categoryHelpers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import ComponentEditForm from './forms/ComponentEditForm';
import ImagePinViewer from './ImagePinViewer';
import NoteWidget from './NoteWidget';
import TaskList from './TaskList';
import ComponentInstanceList from './ComponentInstanceList';
import SortableWidget from './molecules/SortableWidget';
import WidgetInserter from './molecules/WidgetInserter';

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<WidgetInstance | null>(null);

  const activeWidgets = getActiveWidgets(item);
  const available = getAvailableWidgetTypes(activeWidgets);
  const images = item.images || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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

  function addWidget(widgetType: WidgetType, position: number) {
    const current = [...activeWidgets];
    if (widgetType === 'notes') {
      const noteId = crypto.randomUUID();
      current.splice(position, 0, { id: noteId, type: 'notes' });
      const notes = [...(item.notes || []), { id: noteId, content: '' }];
      onUpdate(item.id, { widgets: current, notes });
    } else {
      current.splice(position, 0, { id: widgetType, type: widgetType });
      onUpdate(item.id, { widgets: current });
    }
  }

  function removeWidget(widget: WidgetInstance) {
    if (widgetHasContent(item, widget)) {
      setPendingRemove(widget);
      return;
    }
    doRemoveWidget(widget);
  }

  function doRemoveWidget(widget: WidgetInstance) {
    const updates: Partial<Component> = {
      widgets: activeWidgets.filter(w => w.id !== widget.id),
    };
    switch (widget.type) {
      case 'images':    updates.images = []; break;
      case 'notes':     updates.notes = (item.notes || []).filter(n => n.id !== widget.id); break;
      case 'tasks':     updates.tasks = []; break;
      case 'instances': updates.instances = []; break;
    }
    onUpdate(item.id, updates);
  }

  function confirmRemove() {
    if (!pendingRemove) return;
    doRemoveWidget(pendingRemove);
    setPendingRemove(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = activeWidgets.findIndex(w => w.id === active.id);
      const newIdx = activeWidgets.findIndex(w => w.id === over.id);
      onUpdate(item.id, { widgets: arrayMove(activeWidgets, oldIdx, newIdx) });
    }
  }

  function renderWidget(widget: WidgetInstance) {
    switch (widget.type) {
      case 'images':
        return (
          <ImagePinViewer
            key={widget.id}
            images={images}
            tasks={item.tasks}
            onUpdateImages={(imgs) => onUpdate(item.id, { images: imgs })}
          />
        );
      case 'notes': {
        const note = item.notes?.find(n => n.id === widget.id);
        return (
          <NoteWidget
            key={widget.id}
            content={note?.content || ''}
            onSave={(content) => {
              const notes = [...(item.notes || [])];
              const idx = notes.findIndex(n => n.id === widget.id);
              if (idx >= 0) {
                notes[idx] = { ...notes[idx], content };
              } else {
                notes.push({ id: widget.id, content });
              }
              onUpdate(item.id, { notes });
            }}
          />
        );
      }
      case 'tasks':
        return (
          <TaskList
            key={widget.id}
            projectId={projectId}
            componentId={item.id}
            tasks={item.tasks}
            images={activeWidgets.some(w => w.type === 'images') ? images : undefined}
          />
        );
      case 'instances':
        return (
          <ComponentInstanceList
            key={widget.id}
            projectId={projectId}
            componentId={item.id}
            instances={item.instances}
            allComponents={allComponents}
            images={activeWidgets.some(w => w.type === 'images') ? images : undefined}
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

  const activeWidget = activeId ? activeWidgets.find(w => w.id === activeId) : null;

  return (
    <div className="space-y-2 max-w-4xl mx-auto">
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
      <WidgetInserter availableWidgets={available} onAdd={(w) => addWidget(w, 0)} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveId(active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={activeWidgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
          {activeWidgets.map((widget, i) => (
            <div key={widget.id}>
              <SortableWidget
                id={widget.id}
                label={WIDGET_LABELS[widget.type]}
                icon={WIDGET_ICONS[widget.type]}
                onRemove={() => removeWidget(widget)}
              >
                {renderWidget(widget)}
              </SortableWidget>
              <WidgetInserter availableWidgets={available} onAdd={(w) => addWidget(w, i + 1)} />
            </div>
          ))}
        </SortableContext>
        <DragOverlay>
          {activeWidget && (() => {
            const Icon = WIDGET_ICONS[activeWidget.type];
            return (
              <div className="bg-background/80 backdrop-blur border rounded-lg shadow-lg p-3 flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{WIDGET_LABELS[activeWidget.type]}</span>
              </div>
            );
          })()}
        </DragOverlay>
      </DndContext>

      {/* AlertDialog for removing widget with content */}
      <AlertDialog open={!!pendingRemove} onOpenChange={() => setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le widget ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le widget &laquo;&nbsp;{pendingRemove && WIDGET_LABELS[pendingRemove.type]}&nbsp;&raquo; contient des donn&eacute;es.
              Elles seront d&eacute;finitivement supprim&eacute;es.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
