import { Component, TaskCategory } from '@/lib/types';
import { getTaskStatsByCategory, getTaskCategoryLabel } from '@/lib/taskCategoryHelpers';
import { Badge } from '@/components/ui/badge';

interface ComponentStatsProps {
  component: Component;
  usageCount: number;
}

export default function ComponentStats({ component, usageCount }: ComponentStatsProps) {
  const taskStats = getTaskStatsByCategory(component.tasks);
  const totalTasks = component.tasks.length;
  const completedTasks = component.tasks.filter(t => t.completed).length;

  return (
    <div className="flex gap-2 flex-wrap">
      {/* Badges par catégorie de tâche */}
      {Object.entries(taskStats).map(([category, stats]) => {
        if (stats.total === 0) return null;
        
        const isComplete = stats.completed === stats.total;
        
        return (
          <Badge
            key={category}
            variant={isComplete ? "default" : "secondary"}
            className={isComplete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
          >
            {getTaskCategoryLabel(category as TaskCategory).split(' ')[0]} {stats.completed}/{stats.total}
          </Badge>
        );
      })}

      {/* Badge instances */}
      {component.instances.length > 0 && (
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          {component.instances.length} instance{component.instances.length > 1 ? 's' : ''}
        </Badge>
      )}

      {/* Badge usage */}
      {usageCount > 0 && (
        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
          🔗 Utilisé {usageCount}× dans le projet
        </Badge>
      )}

      {/* Badge terminé */}
      {completedTasks === totalTasks && totalTasks > 0 && (
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          ✓ Terminé
        </Badge>
      )}
    </div>
  );
}