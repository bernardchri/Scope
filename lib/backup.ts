import { invoke } from '@tauri-apps/api/core';
import { Project } from './types';

export async function createAutoBackup(projects: Project[]): Promise<void> {
  try {
    await invoke('create_auto_backup', {
      data: { projects }
    });
  } catch (error) {
    console.error('Erreur backup:', error);
  }
}
