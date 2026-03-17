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

useProjectStore.subscribe((state, prevState) => {
  const { projects, currentProjectPath } = state;

  // Clear history when project is closed
  if (prevState.projects.length > 0 && projects.length === 0) {
    clearHistory();
    previousProject = null;
    return;
  }

  if (!currentProjectPath || projects.length === 0) return;

  const project = projects[0];
  if (project !== previousProject) {
    saveProjectToPath(currentProjectPath, project);
    previousProject = project;
  }
});

// --- Undo / Redo history ---

const HISTORY_LIMIT = 50;
let past: Project[] = [];
let future: Project[] = [];
let skipHistory = false;

// Track project changes for undo/redo
useProjectStore.subscribe((state, prevState) => {
  if (skipHistory) return;
  const prev = prevState.projects[0];
  const curr = state.projects[0];
  if (prev && curr && prev !== curr) {
    past.push(prev);
    if (past.length > HISTORY_LIMIT) past.shift();
    future = [];
  }
});

export function undo() {
  if (past.length === 0) return;
  const current = useProjectStore.getState().projects[0];
  if (current) future.push(current);
  const prev = past.pop()!;
  skipHistory = true;
  useProjectStore.setState({ projects: [prev] });
  previousProject = prev; // sync auto-save reference
  skipHistory = false;
}

export function redo() {
  if (future.length === 0) return;
  const current = useProjectStore.getState().projects[0];
  if (current) past.push(current);
  const next = future.pop()!;
  skipHistory = true;
  useProjectStore.setState({ projects: [next] });
  previousProject = next; // sync auto-save reference
  skipHistory = false;
}

export function canUndo() { return past.length > 0; }
export function canRedo() { return future.length > 0; }

export function clearHistory() {
  past = [];
  future = [];
}
