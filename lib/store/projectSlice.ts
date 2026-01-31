import { StateCreator } from 'zustand';
import { Project } from '../types';

export interface ProjectSlice {
  projects: Project[];
  activeProjectId: string | null;
  
  setProjects: (projects: Project[]) => void;
  setActiveProject: (projectId: string | null) => void;
  addProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
}

export const createProjectSlice = (set: any) => ({
  projects: [],
  activeProjectId: null,
  
  setProjects: (projects: Project[]) => set({ projects }),
  
  setActiveProject: (projectId: string | null) => set({ activeProjectId: projectId }),
  
  addProject: (project: Project) => {
    set((state: any) => ({ projects: [...state.projects, project] }));
  },
  
  deleteProject: (projectId: string) => {
    set((state: any) => ({
      projects: state.projects.filter((p: Project) => p.id !== projectId),
      activeProjectId: state.activeProjectId === projectId ? null : state.activeProjectId
    }));
  },
  
  updateProject: (projectId: string, updates: Partial<Project>) => {
    set((state: any) => ({
      projects: state.projects.map((p: Project) =>
        p.id === projectId ? { ...p, ...updates } : p
      )
    }));
  }
});