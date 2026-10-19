'use client';

import { useEffect, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { assetFileName, writeAssetsToDir } from '@/lib/assetDownload';
import { ComponentAsset } from '@/lib/types';
import { deleteImage, getImageBase64, loadImageSrc } from '@/lib/imageManager';
import { Button } from '@/components/ui/button';

interface ComponentAssetsProps {
  assets: ComponentAsset[];
  folderPath: string;
  onUpdateAssets: (assets: ComponentAsset[]) => void;
}

/** Widget « Ressources » : SVG extraits de Figma (flèches, icônes…), téléchargeables et exportés dans le dossier d'items du Markdown. */
export default function ComponentAssets({ assets, folderPath, onUpdateAssets }: ComponentAssetsProps) {
  const [srcs, setSrcs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(assets.map(async (a) => [a.id, await loadImageSrc(folderPath, a.filename)] as const)).then((pairs) => {
      if (!cancelled) setSrcs(Object.fromEntries(pairs));
    });
    return () => { cancelled = true; };
  }, [assets, folderPath]);

  function remove(asset: ComponentAsset) {
    deleteImage(folderPath, asset.filename).catch(() => {});
    onUpdateAssets(assets.filter((a) => a.id !== asset.id));
  }

  async function download(asset: ComponentAsset) {
    const path = await save({ defaultPath: assetFileName(asset), filters: [{ name: 'SVG', extensions: ['svg'] }] });
    if (!path) return;
    await invoke('write_binary_file', { path, base64Data: await getImageBase64(folderPath, asset.filename) });
  }

  async function downloadAll() {
    const dir = await open({ directory: true, title: 'Dossier de destination des SVG' });
    if (dir) await writeAssetsToDir(folderPath, assets, dir);
  }

  return (
    <div className="space-y-2">
      {assets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune ressource. Coche « exporter » sur un élément SVG dans le plugin Figma pour l&apos;ajouter ici.
        </p>
      ) : (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={downloadAll}>
            <Download className="h-4 w-4 mr-1" /> Tout télécharger ({assets.length})
          </Button>
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
        {assets.map((asset) => (
          <div key={asset.id} className="group relative rounded border p-2 flex flex-col items-center gap-2">
            <div className="h-16 w-full flex items-center justify-center bg-muted rounded">
              {srcs[asset.id] && <img src={srcs[asset.id]} alt={asset.name} className="max-h-14 max-w-full" />}
            </div>
            <span className="text-xs truncate w-full text-center" title={asset.name}>{asset.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-0 left-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={() => download(asset)}
              title="Télécharger"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive"
              onClick={() => remove(asset)}
              title="Supprimer"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
