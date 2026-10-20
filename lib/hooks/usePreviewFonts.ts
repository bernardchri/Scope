import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TokenFont } from '../types';
import { fontFileWeight, googleFontsBasicUrl, googleFontsUrl } from '../fonts';

/**
 * Charge dans la page les polices du projet (fichiers du dossier `fonts/`, feuilles Google Fonts) pour que les
 * aperçus les utilisent. Renvoie un compteur qui change à chaque chargement, pour relancer la détection.
 */
export function usePreviewFonts(folderPath: string | undefined, fonts: TokenFont[] | undefined): number {
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const bump = () => setLoaded(n => n + 1);

    for (const font of fonts ?? []) {
      if (font.kind === 'google') {
        const id = `scope-font-${font.id}`;
        if (document.getElementById(id)) continue;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = font.url ?? googleFontsUrl(font.family);
        link.onload = () => { document.fonts.load(`16px ${JSON.stringify(font.family)}`).then(bump, bump); };
        // Google refuse l'adresse complète (italique, graisses variables) pour une famille qui ne les a pas : on retente en simple.
        if (!font.url) {
          link.onerror = () => {
            link.onerror = null;
            link.href = googleFontsBasicUrl(font.family);
          };
        }
        document.head.appendChild(link);
      } else if (folderPath) {
        const already = Array.from(document.fonts).some(f => f.family.replace(/"/g, '') === font.family && f.weight === fontFileWeight(font) && (f.style === 'italic') === font.italic);
        if (already) continue;
        invoke<string>('read_image_as_base64', { filePath: `${folderPath}/fonts/${font.filename}` })
          .then(dataUrl => new FontFace(font.family, `url(${dataUrl})`, { weight: fontFileWeight(font), style: font.italic ? 'italic' : 'normal' }).load())
          .then(face => { document.fonts.add(face); bump(); })
          .catch(() => { /* fichier absent ou illisible : la police reste signalée comme manquante */ });
      }
    }
  }, [folderPath, fonts]);

  return loaded;
}
