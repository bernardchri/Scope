import { Component } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import ComponentCardImage from './ComponentCardImage';
import ComponentCardContent from './ComponentCardContent';

interface ComponentCardProps {
  component: Component;
  usageCount: number;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export default function ComponentCard({
  component,
  usageCount,
  canDelete,
  onSelect,
  onDelete
}: ComponentCardProps) {
  const totalTasks = component.tasks.length;
  const completedTasks = component.tasks.filter(t => t.completed).length;

  return (
    <Card className="group hover:shadow-lg transition-all overflow-hidden">
      <ComponentCardImage 
        imageBase64={component.imageBase64} 
        name={component.name}
        onClick={onSelect}
      />

      <ComponentCardContent
        component={component}
        usageCount={usageCount}
        totalTasks={totalTasks}
        completedTasks={completedTasks}
        onClick={onSelect}
      />

      <div className="px-4 pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (canDelete) {
              onDelete();
            }
          }}
          disabled={!canDelete}
          className={`w-full ${!canDelete ? 'opacity-20 cursor-not-allowed' : 'hover:bg-destructive hover:text-destructive-foreground'}`}
          title={!canDelete ? 'Ce composant est utilisé ailleurs' : 'Supprimer'}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </Button>
      </div>
    </Card>
  );
}