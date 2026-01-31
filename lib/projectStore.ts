import { create } from 'zustand';
import { Project, Component } from './types';
import { saveProjects } from './persistence';

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;
  
  setProjects: (projects: Project[]) => void;
  setActiveProject: (projectId: string | null) => void;
  
  addProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  
  addComponent: (projectId: string, component: Component) => void;
  deleteComponent: (projectId: string, componentId: string) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,
  
  setProjects: (projects) => set({ projects }),
  
  setActiveProject: (projectId) => set({ activeProjectId: projectId }),
  
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
      )
    }));
    saveProjects(get().projects);
  }
}));