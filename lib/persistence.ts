import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { getStore, getConfigStore } from './store';
import { Project, ComponentImage } from './types';
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

// ─── Folder-based project (format v2) ────────────────────────────────────────

/**
 * Save project to a folder. Strips base64 from images (they are already on disk).
 */
export async function saveProjectToPath(folderPath: string, project: Project): Promise<void> {
  // Strip base64 from images — they live on disk as files
  const cleanProject = stripBase64FromProject(project);
  await invoke('save_project_to_folder', { folderPath, data: cleanProject });
}

/** Remove base64 data from all images before saving to scope.json */
function stripBase64FromProject(project: Project): Project {
  return {
    ...project,
    formatVersion: 2,
    components: project.components.map(comp => ({
      ...comp,
      imageBase64: undefined,
      images: (comp.images || []).map(img => {
        const { base64, ...rest } = img;
        return rest as ComponentImage;
      }),
    })),
  };
}

/**
 * Open a project from a folder (reads scope.json).
 */
export async function openProjectFolder(folderPath: string): Promise<Project | null> {
  try {
    const data = await invoke<any>('load_project_from_folder', { folderPath });
    if (!data || !data.id) return null;
    const project = migrateProjectsToV2([data as Project])[0];
    project.formatVersion = 2;
    return project;
  } catch {
    return null;
  }
}

/**
 * Open a project — auto-detects folder vs legacy .scope file.
 * For .scope files, returns the project but does NOT auto-migrate.
 */
export async function openProjectFile(path: string): Promise<Project | null> {
  // Check if it's a folder with scope.json
  try {
    const isFolder = await invoke<boolean>('is_project_folder', { path });
    if (isFolder) {
      return openProjectFolder(path);
    }
  } catch {
    // Not a folder, try as file
  }

  // Legacy .scope file
  try {
    const data = await invoke<any>('load_project_file', { path });
    let project: Project;
    if (data.projects && Array.isArray(data.projects)) {
      project = data.projects[0];
    } else if (data.id) {
      project = data as Project;
    } else {
      return null;
    }
    return migrateProjectsToV2([project])[0];
  } catch {
    return null;
  }
}

/**
 * Create a new project in a folder.
 */
export async function createNewProjectFolder(
  name: string
): Promise<{ project: Project; path: string } | null> {
  const filePath = await save({
    defaultPath: slugify(name),
  });
  if (!filePath) return null;

  // Create folder structure
  await invoke('create_project_folder', { folderPath: filePath });

  const project: Project = {
    id: crypto.randomUUID(),
    name,
    filename: slugify(name),
    components: [],
    createdAt: new Date().toISOString(),
    formatVersion: 2,
  };

  await invoke('save_project_to_folder', { folderPath: filePath, data: project });
  return { project, path: filePath };
}

/**
 * Migrate a .scope file to folder format.
 * Returns the migrated project data.
 */
export async function migrateScopeToFolder(
  scopePath: string,
  folderPath: string
): Promise<Project | null> {
  try {
    const data = await invoke<any>('migrate_scope_to_folder', { scopePath, folderPath });
    if (!data || !data.id) return null;
    return migrateProjectsToV2([data as Project])[0];
  } catch (e) {
    console.error('Erreur migration:', e);
    return null;
  }
}

// Keep legacy function for compat (unused but safe)
export async function createNewProjectFile(
  name: string
): Promise<{ project: Project; path: string } | null> {
  return createNewProjectFolder(name);
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

export async function removeRecentFile(path: string): Promise<void> {
  const store = await getConfigStore();
  const recent = (await store.get<RecentFile[]>('recentFiles')) || [];
  await store.set('recentFiles', recent.filter(r => r.path !== path));
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
