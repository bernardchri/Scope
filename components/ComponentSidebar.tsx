'use client';

import { Component, ScopeItemType } from '@/lib/types';
import { getCategoryLabel, SCOPE_ITEM_TYPES } from '@/lib/categoryHelpers';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight, GripVertical, Home, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Display order for the sidebar
const SIDEBAR_ORDER: ScopeItemType[] = ['document', 'template', 'section', 'component'];

// ─── Sortable item ────────────────────────────────────────────────────────────

interface SortableItemProps {
  component: Component;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function SortableItem({ component, isSelected, onSelect }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id });

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
      </Button>
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

interface CategorySectionProps {
  category: ScopeItemType;
  components: Component[];
  groupedComponents: Record<string, Component[]>;
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
  onReorderComponents: (orderedIds: string[]) => void;
}

function CategorySection({
  category,
  components,
  groupedComponents,
  selectedComponentId,
  onSelectComponent,
  onReorderComponents,
}: CategorySectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = components.findIndex(c => c.id === active.id);
    const newIndex = components.findIndex(c => c.id === over.id);
    const reordered = arrayMove(components, oldIndex, newIndex);

    const newIds = SIDEBAR_ORDER.flatMap(cat =>
      cat === category
        ? reordered.map(c => c.id)
        : (groupedComponents[cat] || []).map(c => c.id)
    );
    onReorderComponents(newIds);
  }

  return (
    <Collapsible key={category} defaultOpen className="space-y-1">
      <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-accent rounded-md group">
        <span className="font-semibold text-sm">{getCategoryLabel(category)}</span>
        <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pl-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
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
        </DndContext>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface ComponentSidebarProps {
  components: Component[];
  selectedComponentId: string | null;
  showingDashboard: boolean;
  onSelectComponent: (componentId: string | null) => void;
  onReorderComponents: (orderedIds: string[]) => void;
  onGoHome: () => void;
  onToggleSidebar: () => void;
}

export default function ComponentSidebar({
  components,
  selectedComponentId,
  showingDashboard,
  onSelectComponent,
  onReorderComponents,
  onGoHome,
  onToggleSidebar,
}: ComponentSidebarProps) {
  const groupedComponents = components.reduce((acc, component) => {
    if (!acc[component.category]) acc[component.category] = [];
    acc[component.category].push(component);
    return acc;
  }, {} as Record<string, Component[]>);

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

      <div className="p-4 space-y-2 overflow-y-auto flex-1">
        {SIDEBAR_ORDER.map(type => {
          const items = groupedComponents[type] || [];
          if (items.length === 0) return null;
          return (
            <CategorySection
              key={type}
              category={type}
              components={items}
              groupedComponents={groupedComponents}
              selectedComponentId={selectedComponentId}
              onSelectComponent={onSelectComponent}
              onReorderComponents={onReorderComponents}
            />
          );
        })}
      </div>
    </div>
  );
}
