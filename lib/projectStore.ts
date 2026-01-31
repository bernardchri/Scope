import { create } from 'zustand';
import { Project } from './types';
import { saveProjects } from './persistence';

interface ProjectStore {
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  
  setProjects: (projects) => set({ projects }),
  
  addProject: (project) => {
    set((state) => ({ projects: [...state.projects, project] }));
    saveProjects(get().projects); // Auto-save
  },
  
  deleteProject: (projectId) => {
    set((state) => ({
      projects: state.projects.filter(p => p.id !== projectId)
    }));
    saveProjects(get().projects); // Auto-save
  },
  
  updateProject: (projectId, updates) => {
    set((state) => ({
      projects: state.projects.map(p =>
        p.id === projectId ? { ...p, ...updates } : p
      )
    }));
    saveProjects(get().projects); // Auto-save
  }
}));