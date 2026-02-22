import { Component } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getTaskStatsByCategory } from '@/lib/taskCategoryHelpers';

interface ComponentCardContentProps {
  component: Component;
  usageCount: number;
  totalTasks: number;
  completedTasks: number;
  onClick: () => void;
}

export default function ComponentCardContent({
  component,
  usageCount,
  totalTasks,
  completedTasks,
  onClick
}: ComponentCardContentProps) {
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const stats = getTaskStatsByCategory(component.tasks);

  return (
    <div className="p-4 cursor-pointer" onClick={onClick}>
      {/* 🆕 Titre sans badge catégorie */}
      <h3 className="font-bold text-lg leading-tight mb-2">
        {component.name}
      </h3>

      {/* Description */}
      {component.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {component.description}
        </p>
      )}

      {/* Stats des tâches par catégorie */}
      {totalTasks > 0 && (
        <div className="flex gap-1 flex-wrap mb-3">
          {stats.frontend.total > 0 && (
            <Badge 
              variant="outline" 
              className={`text-xs ${stats.frontend.completed === stats.frontend.total ? 'bg-blue-100 text-blue-700 border-blue-300' : 'text-blue-600'}`}
            >
              🎨 {stats.frontend.completed}/{stats.frontend.total}
            </Badge>
          )}
          {stats.backend.total > 0 && (
            <Badge 
              variant="outline"
              className={`text-xs ${stats.backend.completed === stats.backend.total ? 'bg-purple-100 text-purple-700 border-purple-300' : 'text-purple-600'}`}
            >
              ⚙️ {stats.backend.completed}/{stats.backend.total}
            </Badge>
          )}
          {stats.seo.total > 0 && (
            <Badge 
              variant="outline"
              className={`text-xs ${stats.seo.completed === stats.seo.total ? 'bg-green-100 text-green-700 border-green-300' : 'text-green-600'}`}
            >
              🔍 {stats.seo.completed}/{stats.seo.total}
            </Badge>
          )}
          {stats.motion.total > 0 && (
            <Badge 
              variant="outline"
              className={`text-xs ${stats.motion.completed === stats.motion.total ? 'bg-pink-100 text-pink-700 border-pink-300' : 'text-pink-600'}`}
            >
              🎬 {stats.motion.completed}/{stats.motion.total}
            </Badge>
          )}
        </div>
      )}

      {/* Estimation de temps */}
      {component.estimatedHours !== undefined && (
        <Badge variant="outline" className="text-xs mb-3 text-orange-600 border-orange-300">
          ⏱ {component.estimatedHours}h
        </Badge>
      )}

      {/* Instances utilisées */}
      {usageCount > 0 && (
        <Badge variant="outline" className="text-xs mb-3">
          🔗 Utilisé {usageCount}×
        </Badge>
      )}

      {/* Barre de progression */}
      {totalTasks > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progression</span>
            <span className="font-semibold">{taskProgress}%</span>
          </div>
          <Progress 
            value={taskProgress} 
            className="h-2"
          />
        </div>
      )}
    </div>
  );
}