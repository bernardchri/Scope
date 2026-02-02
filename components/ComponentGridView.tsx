import { Component } from '@/lib/types';
import ComponentCard from './molecules/ComponentCard';

interface ComponentGridViewProps {
  components: Component[];
  canDeleteComponent: (componentId: string) => boolean;
  onSelectComponent: (componentId: string) => void;
  onDeleteComponent: (componentId: string) => void;
}

export default function ComponentGridView({
  components,
  canDeleteComponent,
  onSelectComponent,
  onDeleteComponent
}: ComponentGridViewProps) {
  // Calcul du usageCount pour chaque composant
  function getUsageCount(componentId: string): number {
    return components.reduce(
      (count, c) => count + c.instances.filter(i => i.componentId === componentId).length,
      0
    );
  }

  return (
    <div className="grid gap-4">
      {components.map(component => (
        <ComponentCard
          key={component.id}
          component={component}
          usageCount={getUsageCount(component.id)}
          canDelete={canDeleteComponent(component.id)}
          onSelect={() => onSelectComponent(component.id)}
          onDelete={() => onDeleteComponent(component.id)}
        />
      ))}
    </div>
  );
}