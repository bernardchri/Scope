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
import ParagraphWidget from './ParagraphWidget';
import TaskList from './TaskList';
import ComponentInstanceList from './ComponentInstanceList';
import SortableWidget from './molecules/SortableWidget';
import SlashCommandMenu from './molecules/SlashCommandMenu';

interface ScopeItemDetailProps {
  projectId: string;
  item: Component;
  allComponents: Component[];
  folderPath: string;
  onUpdate: (id: string, updates: Partial<Component>) => void;
  onDelete: () => void;
  onNavigate: (componentId: string) => void;
}

export default function ScopeItemDetail({
  projectId,
  item,
  allComponents,
  folderPath,
  onUpdate,
  onDelete,
  onNavigate,
}: ScopeItemDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<WidgetInstance | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [autoFocusWidgetId, setAutoFocusWidgetId] = useState<string | null>(null);
  const [slashMenu, setSlashMenu] = useState<{
    position: { top: number; left: number };
    widgetId: string;
    textBefore: string;
    textAfter: string;
    filter: string;
  } | null>(null);

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

  function addWidget(widgetType: WidgetType, position: number): string {
    const current = [...activeWidgets];
    if (widgetType === 'notes' || widgetType === 'paragraph') {
      const noteId = crypto.randomUUID();
      current.splice(position, 0, { id: noteId, type: widgetType });
      const notes = [...(item.notes || []), { id: noteId, content: '' }];
      onUpdate(item.id, { widgets: current, notes });
      return noteId;
    } else {
      current.splice(position, 0, { id: widgetType, type: widgetType });
      onUpdate(item.id, { widgets: current });
      return widgetType;
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
      case 'paragraph': updates.notes = (item.notes || []).filter(n => n.id !== widget.id); break;
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
            folderPath={folderPath}
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
      case 'paragraph': {
        const para = item.notes?.find(n => n.id === widget.id);
        return (
          <ParagraphWidget
            key={widget.id}
            content={para?.content || ''}
            autoFocus={autoFocusWidgetId === widget.id}
            onSave={(content) => {
              const notes = [...(item.notes || [])];
              const idx = notes.findIndex(n => n.id === widget.id);
              if (idx >= 0) {
                notes[idx] = { ...notes[idx], content };
              } else {
                notes.push({ id: widget.id, content });
              }
              onUpdate(item.id, { notes });
              if (autoFocusWidgetId === widget.id) setAutoFocusWidgetId(null);
            }}
            onSlashCommand={(caretRect, textBefore, textAfter) => {
              setSlashMenu({
                position: { top: caretRect.bottom, left: caretRect.left },
                widgetId: widget.id,
                textBefore,
                textAfter,
                filter: '',
              });
            }}
            onDelete={() => removeWidget(widget)}
            onSplit={(textBefore, textAfter) => {
              // Save current paragraph with text before cursor
              const notes = [...(item.notes || [])];
              const idx = notes.findIndex(n => n.id === widget.id);
              if (idx >= 0) {
                notes[idx] = { ...notes[idx], content: textBefore };
              } else {
                notes.push({ id: widget.id, content: textBefore });
              }

              // Create new paragraph after current one
              const widgetIdx = activeWidgets.findIndex(w => w.id === widget.id);
              const newId = crypto.randomUUID();
              const newWidgets = [...activeWidgets];
              newWidgets.splice(widgetIdx + 1, 0, { type: 'paragraph', id: newId });
              notes.push({ id: newId, content: textAfter });

              onUpdate(item.id, { widgets: newWidgets, notes });
              setAutoFocusWidgetId(newId);
            }}
          />
        );
      }
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

  function handleAddParagraph(position: number) {
    const id = addWidget('paragraph', position);
    setAutoFocusWidgetId(id);
  }

  function handleSlashSelect(widgetType: WidgetType) {
    if (!slashMenu) return;
    const { widgetId, textBefore, textAfter } = slashMenu;
    const widgetIndex = activeWidgets.findIndex(w => w.id === widgetId);
    if (widgetIndex < 0) { setSlashMenu(null); return; }

    // Update the current paragraph with textBefore (remove the "/")
    const notes = [...(item.notes || [])];
    const noteIdx = notes.findIndex(n => n.id === widgetId);

    const updates: Partial<Component> = {};
    const currentWidgets = [...activeWidgets];
    let insertPos = widgetIndex + 1;

    if (textBefore.trim() === '') {
      // Remove the empty paragraph
      currentWidgets.splice(widgetIndex, 1);
      updates.notes = notes.filter(n => n.id !== widgetId);
      insertPos = widgetIndex;
    } else {
      // Save textBefore in the current paragraph
      if (noteIdx >= 0) {
        notes[noteIdx] = { ...notes[noteIdx], content: textBefore };
      }
      updates.notes = notes;
    }

    // Insert the chosen widget
    if (widgetType === 'notes' || widgetType === 'paragraph') {
      const newId = crypto.randomUUID();
      currentWidgets.splice(insertPos, 0, { id: newId, type: widgetType });
      (updates.notes as typeof notes) = [...(updates.notes || notes), { id: newId, content: '' }];
      insertPos++;
    } else {
      currentWidgets.splice(insertPos, 0, { id: widgetType, type: widgetType });
      insertPos++;
    }

    // If textAfter is not empty, create a new paragraph after
    if (textAfter.trim() !== '') {
      const afterId = crypto.randomUUID();
      currentWidgets.splice(insertPos, 0, { id: afterId, type: 'paragraph' });
      (updates.notes as typeof notes) = [...(updates.notes || notes), { id: afterId, content: textAfter }];
      setAutoFocusWidgetId(afterId);
    }

    updates.widgets = currentWidgets;
    onUpdate(item.id, updates);
    setSlashMenu(null);
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
          onClick={() => setShowDeleteConfirm(true)}
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
      <br/>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveId(active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={activeWidgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-8">
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
            </div>
          ))}
          </div>
        </SortableContext>
        <button
          onClick={() => handleAddParagraph(activeWidgets.length)}
          className="w-full h-8 mt-8 text-left text-sm text-muted-foreground/50 hover:text-muted-foreground px-3 transition-colors cursor-text"
        >
          Tapez du texte…
        </button>
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

      {/* Slash command menu */}
      {slashMenu && (
        <SlashCommandMenu
          position={slashMenu.position}
          availableWidgets={available}
          onSelect={handleSlashSelect}
          onClose={() => setSlashMenu(null)}
          filter={slashMenu.filter}
        />
      )}

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

      {/* AlertDialog for deleting the element */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer &laquo;&nbsp;{item.name}&nbsp;&raquo; ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cet &eacute;l&eacute;ment sera d&eacute;finitivement supprim&eacute;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
