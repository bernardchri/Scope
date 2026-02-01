import { getStore } from './store';
import { Project } from './types';
import { migrateProjectsToV2 } from './migrations'; // 🆕

const PROJECTS_KEY = 'projects';

export async function loadProjects(): Promise<Project[]> {
  const store = await getStore();
  const data = await store.get(PROJECTS_KEY);
  const projects = (data as Project[]) || [];
  
  // 🆕 Migrer les données si nécessaire
  return migrateProjectsToV2(projects);
}

export async function saveProjects(projects: Project[]): Promise<void> {
  const store = await getStore();
  await store.set(PROJECTS_KEY, projects);
  await store.save();
}