import { getStore } from './store';
import { Project } from './types';

const PROJECTS_KEY = 'projects';

export async function loadProjects(): Promise<Project[]> {
  const store = await getStore();
  const data = await store.get(PROJECTS_KEY);
  return (data as Project[]) || [];
}

export async function saveProjects(projects: Project[]): Promise<void> {
  const store = await getStore();
  await store.set(PROJECTS_KEY, projects);
  await store.save();
}