'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { Component } from '@/lib/types';
import { loadImageSrc } from '@/lib/imageManager';
import { writeAssetsToDir } from '@/lib/assetDownload';
import { slugify } from '@/lib/persistence';
import { Button } from '@/components/ui/button';

interface ProjectResourcesProps {
  components: Component[];
  folderPath: string;
  onSelectComponent: (id: string) => void;
}

/** Récapitulatif des ressources (SVG) de tous les composants du projet. */
export default function ProjectResources({ components, folderPath, onSelectComponent }: ProjectResourcesProps) {
  const withAssets = components.filter((c) => (c.assets?.length ?? 0) > 0);
  const total = withAssets.reduce((acc, c) => acc + (c.assets?.length ?? 0), 0);
  const [srcs, setSrcs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const all = withAssets.flatMap((c) => c.assets || []);
    Promise.all(all.map(async (a) => [a.id, await loadImageSrc(folderPath, a.filename)] as const)).then((pairs) => {
      if (!cancelled) setSrcs(Object.fromEntries(pairs));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [components, folderPath]);

  if (total === 0) return null;

  // Un sous-dossier par composant dans le dossier choisi.
  async function downloadAll() {
    const dir = await open({ directory: true, title: 'Dossier de destination des SVG' });
    if (!dir) return;
    for (const c of withAssets) {
      await writeAssetsToDir(folderPath, c.assets || [], `${dir}/${slugify(c.name)}`);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Ressources ({total})
        </h3>
        <Button variant="ghost" size="sm" onClick={downloadAll}>
          <Download className="h-4 w-4 mr-1" /> Tout télécharger
        </Button>
      </div>
      <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
        {withAssets.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelectComponent(c.id)}
            className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent transition-colors text-left"
          >
            <span className="font-medium w-40 shrink-0 truncate">{c.name}</span>
            <div className="flex flex-wrap gap-2 flex-1 min-w-0">
              {(c.assets || []).map((a) => (
                <span key={a.id} className="h-8 w-8 flex items-center justify-center bg-muted rounded" title={a.name}>
                  {srcs[a.id] && <img src={srcs[a.id]} alt={a.name} className="max-h-6 max-w-6" />}
                </span>
              ))}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{c.assets?.length}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
