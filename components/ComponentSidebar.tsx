'use client';

import { useState } from 'react';
import { Collection, Component, ScopeItemType } from '@/lib/types';
import { getCategoryLabel, SCOPE_ITEM_TYPES } from '@/lib/categoryHelpers';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight, Database, GripVertical, Home, Palette, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { componentProgress } from '@/lib/progress';
import { CATEGORY_DROP_PREFIX, SIDEBAR_ORDER, computeReorder } from '@/lib/sidebarReorder';


// ─── Sortable item ────────────────────────────────────────────────────────────

interface SortableItemProps {
  component: Component;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function SortableItem({ component, isSelected, onSelect }: SortableItemProps) {
  const progress = componentProgress(component);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id, data: { category: component.category } });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-1"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 opacity-20 hover:opacity-60 shrink-0"
      >
        <GripVertical className="h-3 w-3" />
      </div>
      <Button
        variant={isSelected ? 'secondary' : 'ghost'}
        size="sm"
        className="flex-1 justify-start truncate"
        onClick={() => onSelect(component.id)}
        title={component.description}
      >
        {component.name}
        {progress.total > 0 && (
          <span className={cn('ml-auto pl-2 text-[11px] font-normal tabular-nums', progress.done === progress.total ? 'text-green-600' : 'text-muted-foreground')} title={`${progress.done} tâche(s) faite(s) sur ${progress.total}`}>
            {progress.done === progress.total ? '✓' : `${progress.done}/${progress.total}`}
          </span>
        )}
      </Button>
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────


interface CategorySectionProps {
  category: ScopeItemType;
  components: Component[];
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
  isDragging: boolean;
}

function CategorySection({
  category,
  components,
  selectedComponentId,
  onSelectComponent,
  isDragging,
}: CategorySectionProps) {
  // Toute la section est une zone de dépôt : permet de déposer sur un titre
  // ou une section vide pour changer le type d'un élément.
  const { setNodeRef, isOver } = useDroppable({ id: CATEGORY_DROP_PREFIX + category, data: { category } });

  return (
    <div
      ref={setNodeRef}
      className={cn('rounded-md', isDragging && 'ring-1 ring-border', isOver && 'bg-accent/50 ring-primary')}
    >
      <Collapsible key={category} defaultOpen className="space-y-1">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-accent rounded-md group">
          <span className="font-semibold text-sm">{getCategoryLabel(category)}</span>
          <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pl-1">
          <SortableContext
            items={components.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {components.map(comp => (
              <SortableItem
                key={comp.id}
                component={comp}
                isSelected={selectedComponentId === comp.id}
                onSelect={onSelectComponent}
              />
            ))}
          </SortableContext>
          {isDragging && components.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">Déposer ici</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Priorité aux éléments sous le pointeur (réordonner). Entre deux éléments ou sous le dernier, le pointeur n'est que
// sur la section : on retient alors l'élément le plus proche de cette section (sinon l'élément « sautait » en fin de
// liste), et la section elle-même seulement si elle est vide.
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const items = hits.filter(c => !String(c.id).startsWith(CATEGORY_DROP_PREFIX));
  if (items.length) return items;
  const section = hits.find(c => String(c.id).startsWith(CATEGORY_DROP_PREFIX));
  if (section) {
    const category = String(section.id).slice(CATEGORY_DROP_PREFIX.length);
    const sectionItems = args.droppableContainers.filter(
      c => !String(c.id).startsWith(CATEGORY_DROP_PREFIX) && c.data.current?.category === category,
    );
    return sectionItems.length ? closestCenter({ ...args, droppableContainers: sectionItems }) : [section];
  }
  return closestCenter(args);
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface ComponentSidebarProps {
  /** Design tokens du projet (saisis dans SCOPE ou reçus d'un plugin) : un accès en tête de liste. */
  tokensActive?: boolean;
  onOpenTokens?: () => void;
  /** Modèle de contenu : listé comme les autres éléments, sous leurs sections. */
  collections?: Collection[];
  selectedCollectionId?: string | null;
  onSelectCollection?: (id: string) => void;
  components: Component[];
  selectedComponentId: string | null;
  showingDashboard: boolean;
  onSelectComponent: (componentId: string | null) => void;
  onReorderComponents: (orderedIds: string[], categoryChange?: { id: string; category: ScopeItemType }) => void;
  onGoHome: () => void;
  onToggleSidebar: () => void;
  onNewElement: () => void;
}

export default function ComponentSidebar({
  tokensActive,
  onOpenTokens,
  collections = [],
  selectedCollectionId,
  onSelectCollection,
  components,
  selectedComponentId,
  showingDashboard,
  onSelectComponent,
  onReorderComponents,
  onGoHome,
  onToggleSidebar,
  onNewElement,
}: ComponentSidebarProps) {
  const groupedComponents = components.reduce((acc, component) => {
    if (!acc[component.category]) acc[component.category] = [];
    acc[component.category].push(component);
    return acc;
  }, {} as Record<string, Component[]>);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = event;
    if (!over) return;
    const moved = active.rect.current.translated;
    const result = computeReorder(
      components,
      String(active.id),
      String(over.id),
      !!moved && moved.top + moved.height / 2 > over.rect.top + over.rect.height / 2,
    );
    if (result) onReorderComponents(result.orderedIds, result.categoryChange);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 p-2 border-b">
        <Button
          variant={showingDashboard ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1 justify-start gap-2"
          onClick={onGoHome}
        >
          <Home className="h-4 w-4" />
          Accueil
        </Button>
      </div>

      <div className="p-2 border-b">
        <Button
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onNewElement}
        >
          <Plus className="h-4 w-4" />
          Nouvel element
        </Button>
      </div>

      <div className="p-4 space-y-2 overflow-y-auto flex-1">
        {onOpenTokens && (
          <Button
            variant={tokensActive ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onOpenTokens}
          >
            <Palette className="h-4 w-4" /> Design tokens
          </Button>
        )}

        {collections.length > 0 && onSelectCollection && (
          <Collapsible defaultOpen className="space-y-1">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-accent rounded-md group">
              <span className="font-semibold text-sm">Collections</span>
              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pl-1">
              {collections.map(collection => (
                <Button
                  key={collection.id}
                  variant={selectedCollectionId === collection.id ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start gap-2 font-normal"
                  onClick={() => onSelectCollection(collection.id)}
                >
                  <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{collection.name}</span>
                </Button>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          // Des sections vides apparaissent au début du glissement : les positions sont remesurées pendant qu'on glisse.
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={e => setDraggingId(String(e.active.id))}
          onDragCancel={() => setDraggingId(null)}
          onDragEnd={handleDragEnd}
        >
          {SIDEBAR_ORDER.map(type => {
            const items = groupedComponents[type] || [];
            // Pendant un drag, toutes les sections s'affichent pour pouvoir changer de type
            if (items.length === 0 && !draggingId) return null;
            return (
              <CategorySection
                key={type}
                category={type}
                components={items}
                selectedComponentId={selectedComponentId}
                onSelectComponent={onSelectComponent}
                isDragging={!!draggingId}
              />
            );
          })}
        </DndContext>
      </div>
    </div>
  );
}
