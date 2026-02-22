'use client';

import { Component, ComponentCategory } from '@/lib/types';
import { getCategoryLabel } from '@/lib/categoryHelpers';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, Home, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ComponentSidebarProps {
  components: Component[];
  selectedComponentId: string | null;
  showingDashboard: boolean;
  onSelectComponent: (componentId: string | null) => void;
  onGoHome: () => void;
  onToggleSidebar: () => void;
}

export default function ComponentSidebar({
  components,
  selectedComponentId,
  showingDashboard,
  onSelectComponent,
  onGoHome,
  onToggleSidebar,
}: ComponentSidebarProps) {
  const groupedComponents = components.reduce((acc, component) => {
    if (!acc[component.category]) acc[component.category] = [];
    acc[component.category].push(component);
    return acc;
  }, {} as Record<ComponentCategory, Component[]>);

  const categories: ComponentCategory[] = [
    'document', 'template', 'section', 'composition',
    'element', 'navigation', 'media', 'form', 'content',
  ];

  const hasDocuments = (groupedComponents['document'] || []).length > 0;
  const componentCategories = categories.filter(c => c !== 'document');
  const hasComponents = componentCategories.some(c => (groupedComponents[c] || []).length > 0);

  function renderCategory(category: ComponentCategory) {
    const categoryComponents = groupedComponents[category] || [];
    if (categoryComponents.length === 0) return null;

    return (
      <Collapsible key={category} defaultOpen className="space-y-2">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-accent rounded-md group">
          <span className="font-semibold text-sm">{getCategoryLabel(category)}</span>
          <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pl-2">
          {categoryComponents.map(component => (
            <Button
              key={component.id}
              variant={selectedComponentId === component.id ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start"
              onClick={() => onSelectComponent(component.id)}
              title={component.description}
            >
              {component.name}
            </Button>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header sidebar : toggle + Accueil */}
      <div className="flex items-center gap-1 p-2 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          title="Masquer la sidebar"
          className="shrink-0"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
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

      {/* Liste des composants */}
      <div className="p-4 space-y-2 overflow-y-auto flex-1">
        {hasDocuments && renderCategory('document')}

        {hasDocuments && hasComponents && (
          <div className="py-1">
            <Separator />
          </div>
        )}

        {componentCategories.map(renderCategory)}
      </div>
    </div>
  );
}
