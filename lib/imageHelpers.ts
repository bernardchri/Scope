import { ImagePin } from './types';

const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1 MB

/** Dessine les pins sur l'image via Canvas et retourne un data URL PNG. */
export async function renderImageWithPins(base64: string, pins: ImagePin[]): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64); return; }

      ctx.drawImage(img, 0, 0);

      const radius = Math.max(12, Math.min(24, img.naturalWidth * 0.025));
      const fontSize = Math.round(radius * 0.9);

      for (const pin of pins) {
        const cx = (pin.x / 100) * img.naturalWidth;
        const cy = (pin.y / 100) * img.naturalHeight;

        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(pin.number), cx, cy);
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  base64?: string;
}

export async function convertImageToBase64(file: File): Promise<ImageValidationResult> {
  // Vérifier la taille
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `L'image est trop grande (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum : 1 MB`
    };
  }

  // Vérifier le type
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'Le fichier doit être une image'
    };
  }

  // Convertir en base64
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve({
        valid: true,
        base64: reader.result as string
      });
    };
    
    reader.onerror = () => {
      resolve({
        valid: false,
        error: 'Erreur lors de la lecture du fichier'
      });
    };
    
    reader.readAsDataURL(file);
  });
}

export function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.src = base64;
  });
}