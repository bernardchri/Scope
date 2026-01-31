import { Task } from '../types';

export interface TaskSlice {
  addTask: (projectId: string, componentId: string, task: Task) => void;
  deleteTask: (projectId: string, componentId: string, taskId: string) => void;
  toggleTask: (projectId: string, componentId: string, taskId: string) => void;
  linkTaskToField: (projectId: string, componentId: string, taskId: string, fieldId: string) => void;
  unlinkTaskFromField: (projectId: string, componentId: string, taskId: string, fieldId: string) => void;
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
  
  linkTaskToField: (projectId: string, componentId: string, taskId: string, fieldId: string) => {
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
                        t.id === taskId
                          ? { ...t, linkedFieldIds: [...new Set([...t.linkedFieldIds, fieldId])] }
                          : t
                      )
                    }
                  : c
              )
            }
          : p
      )
    }));
  },
  
  unlinkTaskFromField: (projectId: string, componentId: string, taskId: string, fieldId: string) => {
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
                        t.id === taskId
                          ? { ...t, linkedFieldIds: t.linkedFieldIds.filter((id: string) => id !== fieldId) }
                          : t
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