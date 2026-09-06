import { Project } from '../types';
import { slugify } from '../persistence';
import { clearImageCache } from '../imageManager';
import type { SetState } from './types';

export interface ProjectSlice {
  projects: Project[];
  activeProjectId: string | null;
  currentProjectPath: string | null;

  openProject: (project: Project, path: string) => void;
  closeProject: () => void;
  setActiveProject: (projectId: string | null) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  setProjects: (projects: Project[]) => void;
}

export const createProjectSlice = (set: SetState) => ({
  projects: [] as Project[],
  activeProjectId: null as string | null,
  currentProjectPath: null as string | null,

  openProject: (project: Project, path: string) =>
    set({ projects: [project], activeProjectId: project.id, currentProjectPath: path }),

  closeProject: () => {
    clearImageCache();
    set({ projects: [], activeProjectId: null, currentProjectPath: null });
  },

  setActiveProject: (projectId: string | null) => set({ activeProjectId: projectId }),

  setProjects: (projects: Project[]) => set({ projects }),

  updateProject: (projectId: string, updates: Partial<Project>) => {
    set((state) => {
      const computedUpdates = { ...updates };
      if (updates.name) {
        computedUpdates.filename = slugify(updates.name);
      }
      return {
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, ...computedUpdates } : p
        )
      };
    });
  },
});
