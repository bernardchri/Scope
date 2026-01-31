import { create } from 'zustand';
import { ProjectStore } from './store/types';
import { createProjectSlice } from './store/projectSlice';
import { createComponentSlice } from './store/componentSlice';
import { createTaskSlice } from './store/taskSlice';
import { createFieldSlice } from './store/fieldSlice';
import { saveProjects } from './persistence';

export const useProjectStore = create<ProjectStore>()((set, get, api) => ({
  ...createProjectSlice(set),
  ...createComponentSlice(set),
  ...createTaskSlice(set),
  ...createFieldSlice(set),
}));

// Middleware pour auto-save après chaque mutation
useProjectStore.subscribe((state) => {
  saveProjects(state.projects);
});