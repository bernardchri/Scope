import { Task, TaskCategory } from './types';

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  frontend: '🎨 Front-end',
  backend: '⚙️ Back-end',
  seo: '🔍 SEO',
  motion: '🎬 Motion'
};

export const TASK_CATEGORY_COLORS: Record<TaskCategory, string> = {
  frontend: 'bg-blue-100 text-blue-700',
  backend: 'bg-purple-100 text-purple-700',
  seo: 'bg-green-100 text-green-700',
  motion: 'bg-pink-100 text-pink-700'
};

export function getTaskCategoryLabel(category: TaskCategory): string {
  return TASK_CATEGORY_LABELS[category];
}

export function getTaskCategoryColor(category: TaskCategory): string {
  return TASK_CATEGORY_COLORS[category];
}

// Ordre standard des catégories de tâches
export const TASK_CATEGORY_ORDER: TaskCategory[] = ['frontend', 'backend', 'seo', 'motion'];

// Labels sans emoji ni couleur, pour les exports texte (markdown, etc.)
export const TASK_CATEGORY_PLAIN_LABELS: Record<TaskCategory, string> = {
  frontend: 'Front-end',
  backend:  'Back-end',
  seo:      'SEO',
  motion:   'Motion',
};

// Helper pour calculer les stats par catégorie
export interface CategoryStats {
  total: number;
  completed: number;
}

export function getTaskStatsByCategory(tasks: Task[]): Record<TaskCategory, CategoryStats> {
  const stats: Record<TaskCategory, CategoryStats> = {
    frontend: { total: 0, completed: 0 },
    backend: { total: 0, completed: 0 },
    seo: { total: 0, completed: 0 },
    motion: { total: 0, completed: 0 }
  };

  tasks.forEach(task => {
    // 🆕 Sécurité : si la tâche n'a pas de catégorie, on met 'frontend' par défaut
    const category = task.category || 'frontend';
    
    // 🆕 Vérifier que la catégorie existe dans stats
    if (stats[category]) {
      stats[category].total++;
      if (task.completed) {
        stats[category].completed++;
      }
    }
  });

  return stats;
}