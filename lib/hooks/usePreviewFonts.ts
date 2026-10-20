import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FontToken } from '../types';
import { fontFileWeight, googleFontsBasicUrl, googleFontsUrl } from '../fonts';

/**
 * Charge dans la page les polices déclarées du projet (fichiers du dossier `fonts/`, feuilles Google Fonts) pour que
 * les aperçus les utilisent. Renvoie un compteur qui change à chaque chargement, pour relancer la détection.
 */
export function usePreviewFonts(folderPath: string | undefined, fonts: FontToken[] | undefined): number {
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const bump = () => setLoaded(n => n + 1);

    for (const font of fonts ?? []) {
      for (const source of font.sources) {
        if (source.kind === 'google') {
          // Une feuille par famille et par adresse : changer la famille d'une police déclarée charge la nouvelle.
          const id = `scope-font-${encodeURIComponent(`${font.family}|${source.url ?? ''}`)}`;
          if (document.getElementById(id)) continue;
          const link = document.createElement('link');
          link.id = id;
          link.rel = 'stylesheet';
          link.href = source.url ?? googleFontsUrl(font.family);
          link.onload = () => { document.fonts.load(`16px ${JSON.stringify(font.family)}`).then(bump, bump); };
          // Google refuse l'adresse complète (italique, graisses variables) pour une famille qui ne les a pas : on retente en simple.
          if (!source.url) {
            link.onerror = () => {
              link.onerror = null;
              link.href = googleFontsBasicUrl(font.family);
            };
          }
          document.head.appendChild(link);
        } else if (folderPath) {
          const weight = fontFileWeight(source);
          const already = Array.from(document.fonts).some(f => f.family.replace(/"/g, '') === font.family && f.weight === weight && (f.style === 'italic') === source.italic);
          if (already) continue;
          invoke<string>('read_image_as_base64', { filePath: `${folderPath}/fonts/${source.filename}` })
            .then(dataUrl => new FontFace(font.family, `url(${dataUrl})`, { weight, style: source.italic ? 'italic' : 'normal' }).load())
            .then(face => { document.fonts.add(face); bump(); })
            .catch(() => { /* fichier absent ou illisible : la police reste signalée comme manquante */ });
        }
      }
    }
  }, [folderPath, fonts]);

  return loaded;
}
