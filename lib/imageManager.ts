import { invoke } from '@tauri-apps/api/core';

const MAX_WIDTH = 2048;

// ─── In-memory cache for loaded image base64 ────────────────────────────────

const imageCache = new Map<string, string>();

function cacheKey(folderPath: string, filename: string): string {
  return `${folderPath}/img/${filename}`;
}

/**
 * Resize image if wider than MAX_WIDTH, convert to target format.
 * Returns { base64DataUri, ext }.
 */
async function processImage(file: File): Promise<{ base64DataUri: string; ext: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const ext = file.type === 'image/jpeg' ? 'jpg'
          : file.type === 'image/gif' ? 'gif'
          : file.type === 'image/webp' ? 'webp'
          : 'png';
        const mimeOut = file.type.startsWith('image/') ? file.type : 'image/png';

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
    };
    reader.onerror = () => reject(new Error('Erreur lecture fichier'));
    reader.readAsDataURL(file);
  });
}

/**
 * Process, resize and save an image file to the project folder.
 * Returns the filename (e.g. "a1b2c3d4.png").
 * Also populates the cache so the image displays immediately.
 */
export async function saveImage(folderPath: string, file: File): Promise<string> {
  const { base64DataUri, ext } = await processImage(file);
  const filename = `${crypto.randomUUID()}.${ext}`;
  await invoke('save_image_file', { folderPath, filename, base64Data: base64DataUri });
  // Cache the base64 so it's immediately available for display
  imageCache.set(cacheKey(folderPath, filename), base64DataUri);
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
