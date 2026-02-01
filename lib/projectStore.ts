import { create } from 'zustand';
import { ProjectStore } from './store/types';
import { createProjectSlice } from './store/projectSlice';
import { createComponentSlice } from './store/componentSlice';
import { createTaskSlice } from './store/taskSlice';
import { createFieldSlice } from './store/fieldSlice';
import { createInstanceSlice } from './store/instanceSlice'; // 🆕
import { saveProjects } from './persistence';

export const useProjectStore = create<ProjectStore>()((set, get, api) => ({
  ...createProjectSlice(set),
  ...createComponentSlice(set, get), // Seul celui-ci utilise get pour l'instant
  ...createTaskSlice(set),
  ...createFieldSlice(set),
  ...createInstanceSlice(set),
}));

// Middleware pour auto-save après chaque mutation
useProjectStore.subscribe((state) => {
  saveProjects(state.projects);
});