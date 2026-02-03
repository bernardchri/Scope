import { Component } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ComponentHeader from './ComponentHeader';
import ComponentStats from './ComponentStats';
import ComponentProgress from './ComponentProgress';
import { Trash2 } from 'lucide-react';

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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6 cursor-pointer" onClick={onSelect}>
        <ComponentHeader component={component} />

        <div className="mt-3">
          <ComponentStats component={component} usageCount={usageCount} />
          <ComponentProgress totalTasks={totalTasks} completedTasks={completedTasks} />
        </div>
      </CardContent>

      <CardFooter>
        <Button
          size="sm"
          disabled={!canDelete}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}