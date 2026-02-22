import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { Project } from './types';
import { slugify } from './persistence';

export async function exportProject(project: Project): Promise<void> {
  const filePath = await save({
    defaultPath: `${slugify(project.name)}.scope`,
    filters: [{ name: 'SCOPE Files', extensions: ['scope'] }]
  });
  if (!filePath) return;
  await invoke('export_to_file', {
    data: { projects: [project] },
    path: filePath
  });
}

export async function exportProjects(projects: Project[]): Promise<void> {
  try {
    console.log('📤 Ouverture du dialog save...');
    
    const filePath = await save({
      defaultPath: 'mesprojets.scope',
      filters: [{
        name: 'SCOPE Files',
        extensions: ['scope']
      }]
    });

    console.log('📂 Fichier sélectionné:', filePath);

    if (!filePath) {
      console.log('⚠️ Aucun fichier sélectionné');
      return; // 🆕 Retour silencieux au lieu de throw
    }

    console.log('💾 Export en cours vers:', filePath);

    await invoke('export_to_file', { 
      data: { projects },
      path: filePath
    });
    
    console.log('✅ Export réussi');
  } catch (error) {
    console.error('❌ Erreur export:', error);
    throw error;
  }
}

export async function importProjectFile(): Promise<Project[]> {
  const filePath = await open({
    multiple: false,
    filters: [{ name: 'SCOPE Files', extensions: ['scope'] }]
  });
  if (!filePath || typeof filePath !== 'string') return [];

  const data = await invoke<any>('load_project_file', { path: filePath });
  if (data.projects && Array.isArray(data.projects)) {
    return data.projects;
  } else if (data.id) {
    return [data as Project];
  }
  return [];
}

export async function importProjects(): Promise<Project[]> {
  try {
    console.log('📥 Ouverture du dialog open...');
    
    const filePath = await open({
      multiple: false,
      filters: [{
        name: 'SCOPE Files',
        extensions: ['scope']
      }]
    });

    console.log('📂 Fichier sélectionné:', filePath);

    if (!filePath || typeof filePath !== 'string') {
      console.log('⚠️ Aucun fichier sélectionné');
      throw new Error('Import annulé');
    }

    console.log('📖 Import en cours depuis:', filePath);

    const result = await invoke<{ projects: Project[] }>('import_from_file', {
      path: filePath
    });
    
    console.log('✅ Import réussi');
    return result.projects;
  } catch (error) {
    console.error('❌ Erreur import:', error);
    throw error;
  }
}

export async function createAutoBackup(projects: Project[]): Promise<void> {
  try {
    console.log('💾 Création du backup automatique...');
    
    await invoke('create_auto_backup', { 
      data: { projects } 
    });
    
    console.log('✅ Backup automatique créé');
  } catch (error) {
    console.error('❌ Erreur backup:', error);
  }
}