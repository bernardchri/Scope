'use client';

import { Collection, PageInfo } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface PageInfoWidgetProps {
  page?: PageInfo;
  collections?: Collection[];
  onChange: (page: PageInfo | undefined) => void;
}

const SELECT_CLASS = 'flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground';

/** Page : adresse, métadonnées SEO et collection mise en scène (fiche d'une entrée ou liste). */
export default function PageInfoWidget({ page, collections = [], onChange }: PageInfoWidgetProps) {
  function set(patch: Partial<PageInfo>) {
    const next = { ...(page ?? {}), ...patch };
    // Une valeur vide retire la clé : « aucune information » redevient `undefined`.
    for (const key of Object.keys(next) as (keyof PageInfo)[]) {
      if (next[key] === undefined || next[key] === '') delete next[key];
    }
    if (!next.collectionId) delete next.collectionRole;
    onChange(Object.keys(next).length ? next : undefined);
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1 text-xs text-muted-foreground">
          Adresse (route)
          <Input
            key={`route-${page?.route ?? ''}`}
            className="h-8 text-sm font-mono"
            placeholder="/ouvrages/:slug"
            defaultValue={page?.route ?? ''}
            onBlur={(e) => set({ route: e.target.value.trim() })}
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Titre SEO
          <Input
            key={`seoTitle-${page?.seoTitle ?? ''}`}
            className="h-8 text-sm"
            placeholder="Titre de l'onglet et des résultats de recherche"
            defaultValue={page?.seoTitle ?? ''}
            onBlur={(e) => set({ seoTitle: e.target.value.trim() })}
          />
        </label>
      </div>

      <label className="space-y-1 text-xs text-muted-foreground block">
        Méta description
        <Textarea
          key={`seoDescription-${page?.seoDescription ?? ''}`}
          rows={2}
          className="text-sm"
          placeholder="Résumé affiché sous le titre dans les résultats (environ 160 caractères)"
          defaultValue={page?.seoDescription ?? ''}
          onBlur={(e) => set({ seoDescription: e.target.value.trim() })}
        />
      </label>

      {collections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-muted-foreground">
            Collection affichée
            <select
              className={SELECT_CLASS}
              value={page?.collectionId ?? ''}
              onChange={(e) => set({ collectionId: e.target.value || undefined })}
            >
              <option value="">—</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {page?.collectionId && (
            <label className="space-y-1 text-xs text-muted-foreground">
              Rôle de la page
              <select
                className={SELECT_CLASS}
                value={page.collectionRole ?? ''}
                onChange={(e) => set({ collectionRole: (e.target.value || undefined) as PageInfo['collectionRole'] })}
              >
                <option value="">—</option>
                <option value="single">Fiche d&apos;une entrée</option>
                <option value="list">Liste des entrées</option>
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
