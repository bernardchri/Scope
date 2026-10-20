import { invoke } from '@tauri-apps/api/core';

export interface FigmaBridgeInfo {
  port: number;
  token: string;
  /** « dev » (build de développement) ou « prod » (app installée). */
  profile?: 'dev' | 'prod';
}

/** Infos de connexion du pont HTTP local utilisé par le futur plugin Figma. */
export async function getFigmaBridgeInfo(): Promise<FigmaBridgeInfo> {
  return invoke<FigmaBridgeInfo>('get_figma_bridge_info');
}

/** Composant proposé au plugin Figma pour lier une zone d'intérêt. */
export interface FigmaCatalogEntry {
  id: string;
  name: string;
  category: string;
  /** Lien Figma du composant, pour la correspondance automatique côté plugin. */
  figmaGroupNodeId?: string;
}

/** Publie la liste des composants du projet ouvert, servie au plugin par
 * `GET /scope-components` sur le pont. */
export async function publishFigmaComponentCatalog(catalog: FigmaCatalogEntry[]): Promise<void> {
  await invoke('set_figma_component_catalog', { catalog });
}
