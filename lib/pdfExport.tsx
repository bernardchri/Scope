import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { slugify } from './persistence';
import { Project } from './types';
import { renderImageWithPins } from './imageHelpers';

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
 * Les coordonnées relatives (%) sont ainsi intégrées directement dans le pixel
 * de l'image, ce qui évite tout problème de ratio avec objectFit: contain.
 */
async function preparePdfProject(project: Project): Promise<Project> {
  const components = await Promise.all(
    project.components.map(async (comp) => {
      const compImages = comp.images ?? [];
      if (compImages.length === 0) return comp;
      const images = await Promise.all(
        compImages.map(async (img) => {
          const pins = img.pins ?? [];
          if (pins.length === 0) return img;
          const bakedBase64 = await renderImageWithPins(img.base64, pins);
          return { ...img, base64: bakedBase64, pins: [] };
        })
      );
      return { ...comp, images };
    })
  );
  return { ...project, components };
}

export async function exportProjectPDF(project: Project): Promise<void> {
  const filePath = await save({
    defaultPath: `${slugify(project.name)}-cahier-des-charges.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (!filePath) return;

  const preparedProject = await preparePdfProject(project);

  // Import dynamique pour éviter les problèmes SSR avec @react-pdf/renderer
  const { pdf } = await import('@react-pdf/renderer');
  const { ProjectPDFDocument } = await import('@/components/pdf/ProjectPDFDocument');

  const element = <ProjectPDFDocument project={preparedProject} />;
  const blob = await pdf(element).toBlob();

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const base64Data = toBase64(bytes);

  await invoke('write_pdf_file', { path: filePath, base64Data });
}
