import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { getStore, getConfigStore } from './store';
import { Project } from './types';
import { migrateProjectsToV2 } from './migrations';

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Fichier courant ─────────────────────────────────────────────────────────

export async function saveProjectToPath(path: string, project: Project): Promise<void> {
  await invoke('save_project_file', { path, data: project });
}

export async function openProjectFile(path: string): Promise<Project | null> {
  try {
    const data = await invoke<any>('load_project_file', { path });
    let project: Project;
    if (data.projects && Array.isArray(data.projects)) {
      // Ancien format gzip multi-projets : on prend le premier
      project = data.projects[0];
    } else if (data.id) {
      project = data as Project;
    } else {
      return null;
    }
    return migrateProjectsToV2([project])[0];
  } catch (e) {
    console.error('Erreur ouverture fichier:', e);
    return null;
  }
}

export async function createNewProjectFile(
  name: string
): Promise<{ project: Project; path: string } | null> {
  const filePath = await save({
    defaultPath: `${slugify(name)}.scope`,
    filters: [{ name: 'SCOPE Files', extensions: ['scope'] }]
  });
  if (!filePath) return null;

  const project: Project = {
    id: `project-${Date.now()}`,
    name,
    filename: slugify(name),
    components: [],
    createdAt: new Date().toISOString()
  };

  await invoke('save_project_file', { path: filePath, data: project });
  return { project, path: filePath };
}

// ─── Fichiers récents ─────────────────────────────────────────────────────────

export interface RecentFile {
  name: string;
  path: string;
  openedAt: string;
}

export async function getRecentFiles(): Promise<RecentFile[]> {
  const store = await getConfigStore();
  return (await store.get<RecentFile[]>('recentFiles')) || [];
}

export async function addRecentFile(name: string, path: string): Promise<void> {
  const store = await getConfigStore();
  const recent = (await store.get<RecentFile[]>('recentFiles')) || [];
  const updated = [
    { name, path, openedAt: new Date().toISOString() },
    ...recent.filter(r => r.path !== path)
  ].slice(0, 3);
  await store.set('recentFiles', updated);
  await store.save();
}

// ─── Migration depuis l'ancien format (projects.dat + working directory) ─────

export function projectFilePath(workingDir: string, project: Project): string {
  const filename = project.filename || slugify(project.name);
  return `${workingDir}/${filename}.scope`;
}

export async function getWorkingDirectory(): Promise<string | null> {
  const store = await getConfigStore();
  const dir = await store.get<string>('workingDirectory');
  return dir || null;
}

export async function loadProjects(workingDir: string): Promise<Project[]> {
  const files = await invoke<string[]>('list_scope_files', { dir: workingDir });
  const projects: Project[] = [];
  for (const file of files) {
    try {
      const data = await invoke<any>('load_project_file', { path: file });
      if (data.projects && Array.isArray(data.projects)) {
        projects.push(...data.projects);
      } else if (data.id) {
        projects.push(data as Project);
      }
    } catch (e) {
      console.error('Erreur chargement fichier:', file, e);
    }
  }
  return migrateProjectsToV2(projects);
}

export async function migrateFromMonolith(workingDir: string): Promise<boolean> {
  const store = await getStore();
  const data = await store.get<Project[]>('projects');
  if (!data || data.length === 0) return false;

  const projects = migrateProjectsToV2(data);
  for (const project of projects) {
    if (!project.filename) project.filename = slugify(project.name);
    const path = projectFilePath(workingDir, project);
    await invoke('save_project_file', { path, data: project });
  }

  await store.clear();
  await store.save();
  return true;
}

// No-op kept for compatibility
export async function saveProjects(_projects: Project[]): Promise<void> {}
