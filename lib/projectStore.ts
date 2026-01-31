import { create } from 'zustand';
import { Project, Component, Task, Field } from './types';
import { saveProjects } from './persistence';

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;
  activeComponentId: string | null;
  
  setProjects: (projects: Project[]) => void;
  setActiveProject: (projectId: string | null) => void;
  setActiveComponent: (componentId: string | null) => void;
  
  addProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  
  addComponent: (projectId: string, component: Component) => void;
  deleteComponent: (projectId: string, componentId: string) => void;
  
  addTask: (projectId: string, componentId: string, task: Task) => void;
  deleteTask: (projectId: string, componentId: string, taskId: string) => void;
  toggleTask: (projectId: string, componentId: string, taskId: string) => void;
  
  addField: (projectId: string, componentId: string, field: Field) => void;
  deleteField: (projectId: string, componentId: string, fieldId: string) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,
  activeComponentId: null,
  
  setProjects: (projects) => set({ projects }),
  
  setActiveProject: (projectId) => set({ activeProjectId: projectId }),
  
  setActiveComponent: (componentId) => set({ activeComponentId: componentId }),
  
  addProject: (project) => {
    set((state) => ({ projects: [...state.projects, project] }));
    saveProjects(get().projects);
  },
  
  deleteProject: (projectId) => {
    set((state) => ({
      projects: state.projects.filter(p => p.id !== projectId),
      activeProjectId: state.activeProjectId === projectId ? null : state.activeProjectId
    }));
    saveProjects(get().projects);
  },
  
  updateProject: (projectId, updates) => {
    set((state) => ({
      projects: state.projects.map(p =>
        p.id === projectId ? { ...p, ...updates } : p
      )
    }));
    saveProjects(get().projects);
  },
  
  addComponent: (projectId, component) => {
    set((state) => ({
      projects: state.projects.map(p =>
        p.id === projectId
          ? { ...p, components: [...p.components, component] }
          : p
      )
    }));
    saveProjects(get().projects);
  },
  
  deleteComponent: (projectId, componentId) => {
    set((state) => ({
      projects: state.projects.map(p =>
        p.id === projectId
          ? { ...p, components: p.components.filter(c => c.id !== componentId) }
          : p
      ),
      activeComponentId: state.activeComponentId === componentId ? null : state.activeComponentId
    }));
    saveProjects(get().projects);
  },
  
  addTask: (projectId, componentId, task) => {
    set((state) => ({
      projects: state.projects.map(p =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map(c =>
                c.id === componentId
                  ? { ...c, tasks: [...c.tasks, task] }
                  : c
              )
            }
          : p
      )
    }));
    saveProjects(get().projects);
  },
  
  deleteTask: (projectId, componentId, taskId) => {
    set((state) => ({
      projects: state.projects.map(p =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map(c =>
                c.id === componentId
                  ? { ...c, tasks: c.tasks.filter(t => t.id !== taskId) }
                  : c
              )
            }
          : p
      )
    }));
    saveProjects(get().projects);
  },
  
  toggleTask: (projectId, componentId, taskId) => {
    set((state) => ({
      projects: state.projects.map(p =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map(c =>
                c.id === componentId
                  ? {
                      ...c,
                      tasks: c.tasks.map(t =>
                        t.id === taskId ? { ...t, completed: !t.completed } : t
                      )
                    }
                  : c
              )
            }
          : p
      )
    }));
    saveProjects(get().projects);
  },
  
  addField: (projectId, componentId, field) => {
    set((state) => ({
      projects: state.projects.map(p =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map(c =>
                c.id === componentId
                  ? { ...c, fields: [...c.fields, field] }
                  : c
              )
            }
          : p
      )
    }));
    saveProjects(get().projects);
  },
  
  deleteField: (projectId, componentId, fieldId) => {
    set((state) => ({
      projects: state.projects.map(p =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map(c =>
                c.id === componentId
                  ? { ...c, fields: c.fields.filter(f => f.id !== fieldId) }
                  : c
              )
            }
          : p
      )
    }));
    saveProjects(get().projects);
  }
}));