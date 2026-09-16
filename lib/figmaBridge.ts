import { invoke } from '@tauri-apps/api/core';

export interface FigmaBridgeInfo {
  port: number;
  token: string;
}

/** Infos de connexion du pont HTTP local utilisé par le futur plugin Figma. */
export async function getFigmaBridgeInfo(): Promise<FigmaBridgeInfo> {
  return invoke<FigmaBridgeInfo>('get_figma_bridge_info');
}
