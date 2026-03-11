import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { Font } from '@react-pdf/renderer';
import { slugify } from './persistence';
import { Project } from './types';
import { renderImageWithPins } from './imageHelpers';
import { getImageBase64 } from './imageManager';

Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/inter/Inter-VariableFont_opsz,wght.ttf' },
    { src: '/fonts/inter/Inter-VariableFont_opsz,wght.ttf', fontWeight: 700 },
    { src: '/fonts/inter/Inter-Italic-VariableFont_opsz,wght.ttf', fontStyle: 'italic' },
  ],
});

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Pré-cuit les pins dans les images via Canvas avant la génération PDF.
 * Charge les images depuis le disque si elles utilisent le format dossier (filename).
 */
async function preparePdfProject(project: Project, folderPath: string): Promise<Project> {
  const components = await Promise.all(
    project.components.map(async (comp) => {
      const compImages = comp.images ?? [];
      if (compImages.length === 0) return comp;
      const images = await Promise.all(
        compImages.map(async (img) => {
          // Load base64 from disk if using folder format
          let base64 = img.base64 || '';
          if (img.filename && folderPath) {
            try {
              base64 = await getImageBase64(folderPath, img.filename);
            } catch {
              // File missing on disk — skip this image
              console.warn(`[PDF] Image introuvable: ${img.filename}`);
            }
          }
          const pins = img.pins ?? [];
          if (pins.length > 0 || img.crop) {
            base64 = await renderImageWithPins(base64, pins, img.crop);
          }
          return { ...img, base64, pins: [], crop: undefined };
        })
      );
      return { ...comp, images };
    })
  );
  return { ...project, components };
}

export async function exportProjectPDF(project: Project, folderPath?: string): Promise<void> {
  const defaultDir = folderPath ? `${folderPath}/export` : undefined;
  const defaultPath = defaultDir
    ? `${defaultDir}/${slugify(project.name)}-cahier-des-charges.pdf`
    : `${slugify(project.name)}-cahier-des-charges.pdf`;

  const filePath = await save({
    defaultPath,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (!filePath) return;

  const preparedProject = await preparePdfProject(project, folderPath || '');

  // Import dynamique pour éviter les problèmes SSR avec @react-pdf/renderer
  const { pdf } = await import('@react-pdf/renderer');
  const { ProjectPDFDocument } = await import('@/components/pdf/ProjectPDFDocument');

  const element = <ProjectPDFDocument project={preparedProject} />;
  const blob = await pdf(element).toBlob();

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const base64Data = toBase64(bytes);

  await invoke('write_pdf_file', { path: filePath, base64Data });
}
