import { create } from 'zustand';
import { ProjectStore } from './store/types';
import { createProjectSlice } from './store/projectSlice';
import { createComponentSlice } from './store/componentSlice';
import { createTaskSlice } from './store/taskSlice';
import { createInstanceSlice } from './store/instanceSlice';
import { saveProjectToPath } from './persistence';
import { Project } from './types';

export const useProjectStore = create<ProjectStore>()((set, get, api) => ({
  ...createProjectSlice(set),
  ...createComponentSlice(set, get),
  ...createTaskSlice(set),
  ...createInstanceSlice(set),
}));

let previousProject: Project | null = null;

// Initialiser avant d'appeler setState pour éviter un save inutile au chargement
export function initPreviousProject(project: Project | null) {
  previousProject = project;
}

useProjectStore.subscribe((state) => {
  const { projects, currentProjectPath } = state;
  if (!currentProjectPath || projects.length === 0) return;

  const project = projects[0];
  if (project !== previousProject) {
    saveProjectToPath(currentProjectPath, project);
    previousProject = project;
  }
});
