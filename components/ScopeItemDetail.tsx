'use client';

import { useState } from 'react';
import { getPinKind } from '@/lib/pinKinds';
import { Collection, Component, FigmaLink, ImagePin, ScopeItemType, WidgetType, WidgetInstance } from '@/lib/types';
import { getCategoryLabel, getCategoryColor, getActiveWidgets, getAvailableWidgetTypes, WIDGET_LABELS, WIDGET_ICONS, widgetHasContent, isTextWidget } from '@/lib/categoryHelpers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Clock, Copy, Pencil } from 'lucide-react';
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
import ParagraphWidget, { Heading1Widget, Heading2Widget, Heading3Widget, BulletWidget } from './ParagraphWidget';
import CommentWidget from './CommentWidget';
import TaskList from './TaskList';
import ComponentInstanceList from './ComponentInstanceList';
import ComponentAssets from './ComponentAssets';
import PageInfoWidget from './PageInfoWidget';
import ProgressBar from './ProgressBar';
import { componentProgress, progressLabel } from '@/lib/progress';
import SortableWidget from './molecules/SortableWidget';
import SlashCommandMenu from './molecules/SlashCommandMenu';
import type { TextBlockHandlers } from './TextBlock';

/**
 * Component mapping for text widgets (storage: "notes").
 * To add a new text widget: create the component, add it here, and register it in scope.config.json.
 */
const TEXT_WIDGET_COMPONENTS: Partial<Record<WidgetType, React.ComponentType<{
  content: string;
  onSave: (content: string) => void;
} & TextBlockHandlers>>> = {
  paragraph: ParagraphWidget,
  heading1: Heading1Widget,
  heading2: Heading2Widget,
  heading3: Heading3Widget,
  bullet: BulletWidget,
  comment: CommentWidget,
};

/**
 * Espacement vertical par type, pensé en hauteur de ligne (24 px = 1 ligne de texte) : le texte n'a aucune marge
 * entre blocs (seul le léger remplissage de la zone de saisie sépare deux lignes), un titre est précédé d'une
 * ligne, un gros bloc (maquettes, tâches, composants, ressources, notes) d'une demi-ligne de chaque côté,
 * soit une ligne entière entre deux gros blocs.
 */
const BLOCK_SPACING: Partial<Record<WidgetType, string>> = {
  paragraph: 'py-0',
  bullet: 'py-0',
  comment: 'py-1',
  heading1: 'pt-6 pb-0',
  heading2: 'pt-5 pb-0',
  heading3: 'pt-4 pb-0',
};

/** Types entre lesquels un bloc de texte peut être transformé (menu de la poignée). */
const TURN_INTO_TYPES: WidgetType[] = ['paragraph', 'heading1', 'heading2', 'heading3', 'bullet', 'comment'];

interface ScopeItemDetailProps {
  projectId: string;
  item: Component;
  allComponents: Component[];
  folderPath: string;
  onUpdate: (id: string, updates: Partial<Component>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onNavigate: (componentId: string) => void;
  collections?: Collection[];
  onCreateCollection?: (collection: Collection) => void;
}

export default function ScopeItemDetail({
  projectId,
  item,
  allComponents,
  folderPath,
  onUpdate,
  onDelete,
  onDuplicate,
  onNavigate,
  collections,
  onCreateCollection,
}: ScopeItemDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<WidgetInstance | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Demande de focus sur un bloc de texte (id, position du curseur) ; `n` relance le focus sur un même bloc.
  const [focusReq, setFocusReq] = useState<{ id: string; caret?: number; n: number } | null>(null);
  // Paragraphe vide toujours présent en fin de page (comme dans Notion) : il n'existe pas dans les données tant qu'on n'y
  // écrit rien, puis devient un vrai bloc (même identifiant, donc même zone de saisie et même focus).
  const [trailingId, setTrailingId] = useState(() => crypto.randomUUID());
  const requestFocus = (id: string, caret?: number) => setFocusReq(prev => ({ id, caret, n: (prev?.n ?? 0) + 1 }));
  const [slashMenu, setSlashMenu] = useState<{
    position: { top: number; left: number };
    widgetId: string;
    textBefore: string;
    textAfter: string;
    filter: string;
  } | null>(null);

  const activeWidgets = getActiveWidgets(item);
  const itemProgress = componentProgress(item);
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
    figmaLink?: FigmaLink,
  ) {
    onUpdate(item.id, {
      name,
      description: description || undefined,
      category,
      estimatedHours,
      figmaLink,
    });
    setIsEditing(false);
  }

  function addWidget(widgetType: WidgetType, position: number): string {
    const current = [...activeWidgets];
    if (isTextWidget(widgetType)) {
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
    // Paragraphes, titres, puces et commentaires partent sans confirmation (Cmd+Z les rend) ; seuls les blocs
    // qui portent des données (maquettes, tâches…) et les notes Markdown demandent confirmation.
    const quick = isTextWidget(widget.type) && widget.type !== 'notes';
    if (!quick && widgetHasContent(item, widget)) {
      setPendingRemove(widget);
      return;
    }
    doRemoveWidget(widget);
  }

  function doRemoveWidget(widget: WidgetInstance) {
    const updates: Partial<Component> = {
      widgets: activeWidgets.filter(w => w.id !== widget.id),
    };
    if (isTextWidget(widget.type)) {
      updates.notes = (item.notes || []).filter(n => n.id !== widget.id);
    } else {
      switch (widget.type) {
        case 'images': updates.images = []; break;
        case 'tasks': updates.tasks = []; break;
        case 'instances': updates.instances = []; break;
        case 'resources': updates.assets = undefined; break;
        case 'page': updates.page = undefined; break;
      }
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

  /** Crée la tâche d'un pin (nommée d'après lui) : le pin passe alors « à faire » et suit son avancement. */
  function addTaskForPin(imageId: string, pin: ImagePin) {
    const kind = getPinKind(pin.kind);
    const backendKinds = ['list', 'relation', 'repeater', 'category', 'form'];
    onUpdate(item.id, {
      tasks: [...item.tasks, {
        id: crypto.randomUUID(),
        name: pin.label || kind?.label || `Pin #${pin.number}`,
        completed: false,
        category: backendKinds.includes(pin.kind ?? '') ? 'backend' : 'frontend',
        pinRef: { imageId, pinId: pin.id, pinNumber: pin.number },
      }],
    });
  }

  function toggleTask(taskId: string) {
    onUpdate(item.id, { tasks: item.tasks.map(t => (t.id === taskId ? { ...t, completed: !t.completed } : t)) });
  }

  /** Change le type d'un bloc de texte en gardant son identifiant ; `content` remplace son texte si fourni. */
  function setWidgetType(id: string, type: WidgetType, content?: string) {
    const updates: Partial<Component> = { widgets: activeWidgets.map(w => (w.id === id ? { ...w, type } : w)) };
    if (content !== undefined) {
      const notes = [...(item.notes || [])];
      const idx = notes.findIndex(n => n.id === id);
      if (idx >= 0) notes[idx] = { ...notes[idx], content };
      else notes.push({ id, content });
      updates.notes = notes;
    }
    onUpdate(item.id, updates);
  }

  function duplicateWidget(widget: WidgetInstance) {
    const idx = activeWidgets.findIndex(w => w.id === widget.id);
    const newId = crypto.randomUUID();
    const content = item.notes?.find(n => n.id === widget.id)?.content ?? '';
    const widgets = [...activeWidgets];
    widgets.splice(idx + 1, 0, { id: newId, type: widget.type });
    onUpdate(item.id, { widgets, notes: [...(item.notes || []), { id: newId, content }] });
  }

  function moveWidget(widget: WidgetInstance, delta: -1 | 1) {
    const idx = activeWidgets.findIndex(w => w.id === widget.id);
    const target = idx + delta;
    if (target < 0 || target >= activeWidgets.length) return;
    onUpdate(item.id, { widgets: arrayMove(activeWidgets, idx, target) });
  }

  /** « + » d'un bloc : insère le type choisi juste en dessous ; un bloc de texte prend aussitôt le focus. */
  function addAfter(widget: WidgetInstance, type: WidgetType) {
    const id = addWidget(type, activeWidgets.findIndex(w => w.id === widget.id) + 1);
    if (isTextWidget(type)) requestFocus(id, 0);
  }

  function blockActions(widget: WidgetInstance) {
    const idx = activeWidgets.findIndex(w => w.id === widget.id);
    const isText = isTextWidget(widget.type) && widget.type !== 'notes';
    return {
      addTypes: available,
      onAddAfter: (type: WidgetType) => addAfter(widget, type),
      onMove: (delta: -1 | 1) => moveWidget(widget, delta),
      canMoveUp: idx > 0,
      canMoveDown: idx < activeWidgets.length - 1,
      onDuplicate: isText ? () => duplicateWidget(widget) : undefined,
      turnIntoTypes: isText ? TURN_INTO_TYPES : undefined,
      currentType: widget.type,
      onTurnInto: isText ? (type: WidgetType) => setWidgetType(widget.id, type) : undefined,
    };
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
            instances={item.instances}
            allComponents={allComponents}
            onNavigate={onNavigate}
            collections={collections}
            onCreateCollection={onCreateCollection}
            onAddTaskForPin={addTaskForPin}
            onToggleTask={toggleTask}
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
      case 'resources':
        return (
          <ComponentAssets
            key={widget.id}
            assets={item.assets || []}
            folderPath={folderPath}
            onUpdateAssets={(assets) => onUpdate(item.id, { assets: assets.length ? assets : undefined })}
          />
        );
      case 'page':
        return (
          <PageInfoWidget
            key={widget.id}
            page={item.page}
            collections={collections}
            onChange={(page) => onUpdate(item.id, { page })}
          />
        );
      default: {
        // Text widgets (paragraph, comment, etc.) — rendered via TEXT_WIDGET_COMPONENTS mapping
        const TextComp = TEXT_WIDGET_COMPONENTS[widget.type];
        if (!TextComp) return null;
        const note = item.notes?.find(n => n.id === widget.id);
        const widgetIdx = activeWidgets.findIndex(w => w.id === widget.id);
        // Bloc de texte précédent (hors « Notes », éditeur Markdown à part) : cible de la fusion et du focus au retour arrière.
        const prev = widgetIdx > 0 ? activeWidgets[widgetIdx - 1] : undefined;
        const prevText = prev && isTextWidget(prev.type) && prev.type !== 'notes' ? prev : undefined;
        const prevContent = prevText ? item.notes?.find(n => n.id === prevText.id)?.content ?? '' : '';
        return (
          <TextComp
            key={widget.id}
            content={note?.content || ''}
            autoFocus={focusReq?.id === widget.id}
            focusToken={focusReq?.n}
            focusCaret={focusReq?.id === widget.id ? focusReq.caret : undefined}
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
            onSlashCommand={(caretRect, textBefore, textAfter) => {
              setSlashMenu({
                position: { top: caretRect.bottom, left: caretRect.left },
                widgetId: widget.id,
                textBefore,
                textAfter,
                filter: '',
              });
            }}
            onSlashFilter={(filter) => setSlashMenu(menu => (menu ? { ...menu, filter } : menu))}
            onSlashClose={() => setSlashMenu(null)}
            onDelete={() => {
              removeWidget(widget);
              if (prevText) requestFocus(prevText.id, prevContent.length);
            }}
            onShortcut={widget.type === 'paragraph' ? (type, rest) => {
              setWidgetType(widget.id, type, rest);
              requestFocus(widget.id, 0);
            } : undefined}
            onConvertToParagraph={widget.type !== 'paragraph' ? () => {
              setWidgetType(widget.id, 'paragraph');
              requestFocus(widget.id, 0);
            } : undefined}
            onMergeBack={prevText ? (value) => {
              const notes = (item.notes || []).filter(n => n.id !== widget.id);
              const merged = prevContent + value;
              const at = notes.findIndex(n => n.id === prevText.id);
              if (at >= 0) notes[at] = { ...notes[at], content: merged };
              else notes.push({ id: prevText.id, content: merged });
              onUpdate(item.id, { widgets: activeWidgets.filter(w => w.id !== widget.id), notes });
              requestFocus(prevText.id, prevContent.length);
            } : undefined}
            onSplit={(textBefore, textAfter) => {
              // Une puce vide qu'on valide redevient un paragraphe (comme dans Notion) ; un titre est suivi d'un paragraphe.
              if (widget.type === 'bullet' && textBefore === '' && textAfter === '') {
                setWidgetType(widget.id, 'paragraph');
                requestFocus(widget.id, 0);
                return;
              }
              const nextType: WidgetType = widget.type.startsWith('heading') ? 'paragraph' : widget.type;
              const notes = [...(item.notes || [])];
              const idx = notes.findIndex(n => n.id === widget.id);
              if (idx >= 0) {
                notes[idx] = { ...notes[idx], content: textBefore };
              } else {
                notes.push({ id: widget.id, content: textBefore });
              }

              const newId = crypto.randomUUID();
              const newWidgets = [...activeWidgets];
              newWidgets.splice(widgetIdx + 1, 0, { type: nextType, id: newId });
              notes.push({ id: newId, content: textAfter });

              onUpdate(item.id, { widgets: newWidgets, notes });
              requestFocus(newId, 0);
            }}
          />
        );
      }
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
          figmaLink={item.figmaLink}
          onSubmit={handleSaveEdit}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  /** Crée le vrai bloc derrière le paragraphe vide de fin de page, avec le texte déjà saisi. */
  function materializeTrailing(content: string, type: WidgetType = 'paragraph') {
    onUpdate(item.id, {
      widgets: [...activeWidgets, { id: trailingId, type }],
      notes: [...(item.notes || []), { id: trailingId, content }],
    });
    setTrailingId(crypto.randomUUID());
  }

  const lastWidget = activeWidgets[activeWidgets.length - 1];
  const lastIsEmptyText = !!lastWidget && isTextWidget(lastWidget.type) && lastWidget.type !== 'notes'
    && !item.notes?.find(n => n.id === lastWidget.id)?.content;
  const showTrailing = !lastIsEmptyText;
  const trailingWidget: WidgetInstance = { id: trailingId, type: 'paragraph' };
  const blocks = [
    ...activeWidgets.map(widget => ({ widget, placeholder: false })),
    ...(showTrailing ? [{ widget: trailingWidget, placeholder: true }] : []),
  ];

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
    if (isTextWidget(widgetType)) {
      const newId = crypto.randomUUID();
      currentWidgets.splice(insertPos, 0, { id: newId, type: widgetType });
      (updates.notes as typeof notes) = [...(updates.notes || notes), { id: newId, content: '' }];
      requestFocus(newId, 0);
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
      requestFocus(afterId, 0);
    }

    updates.widgets = currentWidgets;
    onUpdate(item.id, updates);
    setSlashMenu(null);
  }

  const activeWidget = activeId ? activeWidgets.find(w => w.id === activeId) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 ">
        <div className='flex gap-1 w-full'>
          <h1 className="text-2xl font-bold flex-1">{item.name}</h1>
        </div>

        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} title="Modifier">
          <Pencil className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-1" />
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

      <div className='flex flex-col items-start gap-6 '>
        <div>
          <Badge className={`${getCategoryColor(item.category)}`}>
            {getCategoryLabel(item.category)}
          </Badge>
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
        {itemProgress.total > 0 && (
          <div className="w-full max-w-md space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">Avancement</span>
              <span className="tabular-nums text-muted-foreground">{progressLabel(itemProgress)}</span>
            </div>
            <ProgressBar ratio={itemProgress.ratio} />
          </div>
        )}
      </div>


      {/* Widgets */}
      <br />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveId(active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={blocks.map(b => b.widget.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col">
            {blocks.map(({ widget, placeholder }) => (
              <div key={widget.id}>
                <SortableWidget
                  id={widget.id}
                  label={WIDGET_LABELS[widget.type]}
                  icon={WIDGET_ICONS[widget.type]}
                  onRemove={() => removeWidget(widget)}
                  actions={placeholder ? undefined : blockActions(widget)}
                  placeholder={placeholder}
                  spacing={BLOCK_SPACING[widget.type] ?? 'py-3'}
                >
                  {placeholder ? (
                    <ParagraphWidget
                      // Même clé que le bloc réel qui prendra sa place : la zone de saisie (et son focus) est conservée.
                      key={trailingId}
                      content=""
                      onSave={() => {}}
                      onInput={(value) => materializeTrailing(value)}
                      onSlashCommand={(caretRect, textBefore, textAfter) => {
                        setSlashMenu({
                          position: { top: caretRect.bottom, left: caretRect.left },
                          widgetId: trailingId,
                          textBefore,
                          textAfter,
                          filter: '',
                        });
                      }}
                      onSlashFilter={(filter) => setSlashMenu(menu => (menu ? { ...menu, filter } : menu))}
                      onSlashClose={() => setSlashMenu(null)}
                      onShortcut={(type, rest) => {
                        materializeTrailing(rest, type);
                        requestFocus(trailingId, 0);
                      }}
                    />
                  ) : renderWidget(widget)}
                </SortableWidget>
              </div>
            ))}
          </div>
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
