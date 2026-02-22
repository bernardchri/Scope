'use client';

import { Component, ComponentCategory } from '@/lib/types';
import { getCategoryLabel } from '@/lib/categoryHelpers';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ComponentSidebarProps {
  components: Component[];
  selectedComponentId: string | null;
  onSelectComponent: (componentId: string | null) => void;
}

export default function ComponentSidebar({
  components,
  selectedComponentId,
  onSelectComponent
}: ComponentSidebarProps) {
  // Grouper les composants par catégorie
  const groupedComponents = components.reduce((acc, component) => {
    if (!acc[component.category]) {
      acc[component.category] = [];
    }
    acc[component.category].push(component);
    return acc;
  }, {} as Record<ComponentCategory, Component[]>);

  // 🆕 Documents EN PREMIER
  const categories: ComponentCategory[] = [
    'document',      // 🆕
    'template',
    'section',
    'composition',
    'element',
    'navigation',
    'media',
    'form',
    'content'
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
    <div className="p-4 space-y-2">
      {/* Documents — section séparée en haut */}
      {hasDocuments && renderCategory('document')}

      {/* Séparateur si les deux sections sont présentes */}
      {hasDocuments && hasComponents && (
        <div className="py-1">
          <Separator />
        </div>
      )}

      {/* Composants */}
      {componentCategories.map(renderCategory)}
    </div>
  );
}