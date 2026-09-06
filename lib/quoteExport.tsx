import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { slugify, getAppSettings } from './persistence';
import { Project } from './types';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Exporte le devis PDF (pas d'images à pré-cuire, contrairement au cahier des charges). */
export async function exportProjectQuote(project: Project, folderPath?: string): Promise<void> {
  const defaultDir = folderPath ? `${folderPath}/export` : undefined;
  const defaultPath = defaultDir
    ? `${defaultDir}/${slugify(project.name)}-devis.pdf`
    : `${slugify(project.name)}-devis.pdf`;

  const filePath = await save({
    defaultPath,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (!filePath) return;

  const appSettings = await getAppSettings();

  const { pdf } = await import('@react-pdf/renderer');
  const { QuotePDFDocument } = await import('@/components/pdf/QuotePDFDocument');

  const element = <QuotePDFDocument project={project} studioName={appSettings.studioName} />;
  const blob = await pdf(element).toBlob();

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const base64Data = toBase64(bytes);

  await invoke('write_pdf_file', { path: filePath, base64Data });
}
