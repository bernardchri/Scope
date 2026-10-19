import { invoke } from '@tauri-apps/api/core';
import { ComponentAsset } from './types';
import { getImageBase64 } from './imageManager';
import { slugify } from './persistence';

/** Nom de fichier proposé pour une ressource. */
export function assetFileName(asset: ComponentAsset): string {
  return `${slugify(asset.name) || 'element'}.svg`;
}

/** Écrit les SVG dans `dir` ; un suffixe numérique évite d'écraser deux éléments de même nom. */
export async function writeAssetsToDir(folderPath: string, assets: ComponentAsset[], dir: string): Promise<void> {
  const used = new Set<string>();
  for (const asset of assets) {
    const base = assetFileName(asset).replace(/\.svg$/, '');
    let name = base;
    for (let n = 2; used.has(name); n++) name = `${base}-${n}`;
    used.add(name);
    await invoke('write_binary_file', { path: `${dir}/${name}.svg`, base64Data: await getImageBase64(folderPath, asset.filename) });
  }
}
