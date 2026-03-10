import { invoke } from '@tauri-apps/api/core';

const MAX_WIDTH = 2048;

// ─── In-memory cache for loaded image base64 ────────────────────────────────

const imageCache = new Map<string, string>();

function cacheKey(folderPath: string, filename: string): string {
  return `${folderPath}/img/${filename}`;
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

/**
 * Resize image if wider than MAX_WIDTH, convert to target format.
 * Accepts a data URI and file extension (no FileReader needed).
 * Returns { base64DataUri, ext }.
 */
async function processImage(dataUri: string, ext: string): Promise<{ base64DataUri: string; ext: string }> {
  const mimeOut = EXT_TO_MIME[ext] || 'image/png';
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      if (img.naturalWidth <= MAX_WIDTH) {
        resolve({ base64DataUri: dataUri, ext });
        return;
      }
      // Resize via canvas
      const scale = MAX_WIDTH / img.naturalWidth;
      const canvas = document.createElement('canvas');
      canvas.width = MAX_WIDTH;
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve({ base64DataUri: dataUri, ext }); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ base64DataUri: canvas.toDataURL(mimeOut, 0.9), ext });
    };
    img.onerror = () => reject(new Error('Impossible de charger l\'image'));
    img.src = dataUri;
  });
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '');
}

/**
 * Save an image from an absolute file path.
 * If the file is already inside `img/`, reuse it (invalidate cache to pick up external edits).
 * Otherwise, read the file via Rust, resize if needed, and save with a UUID filename.
 */
export async function saveImageFromPath(folderPath: string, filePath: string): Promise<string> {
  const nFolder = normalizePath(folderPath);
  const nFile = normalizePath(filePath);
  const imgDir = `${nFolder}/img/`;

  if (nFile.startsWith(imgDir)) {
    // File already in project img/ — reuse it
    const filename = nFile.slice(imgDir.length);
    // Invalidate cache so external edits are picked up
    imageCache.delete(cacheKey(folderPath, filename));
    // Re-load from disk into cache
    await loadImageSrc(folderPath, filename);
    return filename;
  }

  // External file — read via Rust, resize, save with UUID
  const base64DataUri = await invoke<string>('read_image_as_base64', { filePath: nFile });
  const rawExt = nFile.split('.').pop()?.toLowerCase() || 'png';
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const processed = await processImage(base64DataUri, ext);
  const filename = `${crypto.randomUUID()}.${processed.ext}`;
  await invoke('save_image_file', { folderPath, filename, base64Data: processed.base64DataUri });
  imageCache.set(cacheKey(folderPath, filename), processed.base64DataUri);
  return filename;
}

/**
 * Get a displayable src for an image.
 * Returns cached base64 if available, otherwise empty string.
 * Use loadImageSrc() to async-load from disk.
 */
export function getImageSrc(folderPath: string, filename: string): string {
  return imageCache.get(cacheKey(folderPath, filename)) || '';
}

/**
 * Load an image from disk into cache and return its base64 data URI.
 */
export async function loadImageSrc(folderPath: string, filename: string): Promise<string> {
  const key = cacheKey(folderPath, filename);
  const cached = imageCache.get(key);
  if (cached) return cached;

  const base64 = await invoke<string>('read_image_as_base64', { filePath: key });
  imageCache.set(key, base64);
  return base64;
}

/**
 * Read an image from disk and return its base64 data URI.
 * Used for PDF generation and canvas pin rendering.
 */
export async function getImageBase64(folderPath: string, filename: string): Promise<string> {
  return loadImageSrc(folderPath, filename);
}

/**
 * Delete an image file from the project folder.
 */
export async function deleteImage(folderPath: string, filename: string): Promise<void> {
  imageCache.delete(cacheKey(folderPath, filename));
  await invoke('delete_image_file', { folderPath, filename });
}

/**
 * Clear all cached images (e.g. when closing a project).
 */
export function clearImageCache(): void {
  imageCache.clear();
}
