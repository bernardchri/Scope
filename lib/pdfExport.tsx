import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { slugify } from './persistence';
import { Project } from './types';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function exportProjectPDF(project: Project): Promise<void> {
  const filePath = await save({
    defaultPath: `${slugify(project.name)}-cahier-des-charges.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (!filePath) return;

  // Import dynamique pour éviter les problèmes SSR avec @react-pdf/renderer
  const { pdf } = await import('@react-pdf/renderer');
  const { ProjectPDFDocument } = await import('@/components/pdf/ProjectPDFDocument');

  const element = <ProjectPDFDocument project={project} />;
  const blob = await pdf(element).toBlob();

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const base64Data = toBase64(bytes);

  await invoke('write_pdf_file', { path: filePath, base64Data });
}
