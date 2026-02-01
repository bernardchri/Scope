import { Task } from '../types';

export interface TaskSlice {
  addTask: (projectId: string, componentId: string, task: Task) => void;
  deleteTask: (projectId: string, componentId: string, taskId: string) => void;
  toggleTask: (projectId: string, componentId: string, taskId: string) => void;
  updateTask: (projectId: string, componentId: string, taskId: string, updates: Partial<Task>) => void; // 🆕
}

export const createTaskSlice = (set: any) => ({
  addTask: (projectId: string, componentId: string, task: Task) => {
    set((state: any) => ({
      projects: state.projects.map((p: any) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c: any) =>
                c.id === componentId
                  ? { ...c, tasks: [...c.tasks, task] }
                  : c
              )
            }
          : p
      )
    }));
  },
  
  deleteTask: (projectId: string, componentId: string, taskId: string) => {
    set((state: any) => ({
      projects: state.projects.map((p: any) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c: any) =>
                c.id === componentId
                  ? { ...c, tasks: c.tasks.filter((t: any) => t.id !== taskId) }
                  : c
              )
            }
          : p
      )
    }));
  },
  
  toggleTask: (projectId: string, componentId: string, taskId: string) => {
    set((state: any) => ({
      projects: state.projects.map((p: any) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c: any) =>
                c.id === componentId
                  ? {
                      ...c,
                      tasks: c.tasks.map((t: any) =>
                        t.id === taskId ? { ...t, completed: !t.completed } : t
                      )
                    }
                  : c
              )
            }
          : p
      )
    }));
  },

  // 🆕 Nouvelle action pour mettre à jour une tâche (notamment la catégorie)
  updateTask: (projectId: string, componentId: string, taskId: string, updates: Partial<Task>) => {
    set((state: any) => ({
      projects: state.projects.map((p: any) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c: any) =>
                c.id === componentId
                  ? {
                      ...c,
                      tasks: c.tasks.map((t: any) =>
                        t.id === taskId ? { ...t, ...updates } : t
                      )
                    }
                  : c
              )
            }
          : p
      )
    }));
  }
});