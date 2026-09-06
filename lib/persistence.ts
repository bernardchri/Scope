import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { getConfigStore } from './store';
import { Project, ComponentImage, AppSettings, DEFAULT_APP_SETTINGS } from './types';
import { migrateProjectsToV2 } from './migrations';
import { parseProject } from './projectSchema';

/**
 * Applique la migration legacy puis la validation défensive (Zod).
 * Journalise les réparations. Retourne `null` si le projet est inexploitable.
 */
function normalizeLoadedProject(raw: unknown, source: string): Project | null {
  const migrated = migrateProjectsToV2([raw as Project])[0];
  const { project, issues } = parseProject(migrated);
  if (issues.length > 0) {
    console.warn(`[scope.json] anomalies détectées (${source}) :\n- ${issues.join('\n- ')}`);
  }
  if (!project) {
    console.error(`[scope.json] fichier inexploitable (${source})`);
    return null;
  }
  return project;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
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
      images: (comp.images || []).map(img => {
        const rest = { ...img };
        delete rest.base64;
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
    const data = await invoke<Record<string, unknown>>('load_project_from_folder', { folderPath });
    if (!data || !data.id) return null;
    const project = normalizeLoadedProject(data, 'dossier');
    if (project) project.formatVersion = 2;
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
    const data = await invoke<Record<string, unknown>>('load_project_file', { path });
    let raw: unknown;
    if (Array.isArray(data.projects)) {
      raw = data.projects[0];
    } else if (data.id) {
      raw = data;
    } else {
      return null;
    }
    return normalizeLoadedProject(raw, 'fichier .scope');
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
    const data = await invoke<Record<string, unknown>>('migrate_scope_to_folder', { scopePath, folderPath });
    if (!data || !data.id) return null;
    return normalizeLoadedProject(data, 'migration .scope');
  } catch (e) {
    console.error('Erreur migration:', e);
    return null;
  }
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

// ─── App Settings ─────────────────────────────────────────────────────────────

export async function getAppSettings(): Promise<AppSettings> {
  const store = await getConfigStore();
  const saved = await store.get<Partial<AppSettings>>('appSettings');
  return {
    ...DEFAULT_APP_SETTINGS,
    ...saved,
    pdf: { ...DEFAULT_APP_SETTINGS.pdf, ...saved?.pdf },
    markdown: { ...DEFAULT_APP_SETTINGS.markdown, ...saved?.markdown },
    comment: { ...DEFAULT_APP_SETTINGS.comment, ...saved?.comment },
  };
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const store = await getConfigStore();
  await store.set('appSettings', settings);
  await store.save();
}

