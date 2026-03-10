import { ImagePin, CropRect } from './types';

/** Remap a pin from full-image space to cropped-view space. Returns visible=false if outside crop. */
export function pinToCroppedSpace(pin: ImagePin, crop: CropRect): ImagePin & { visible: boolean } {
  const x = ((pin.x - crop.x) / crop.width) * 100;
  const y = ((pin.y - crop.y) / crop.height) * 100;
  const visible = x >= -2 && x <= 102 && y >= -2 && y <= 102;
  return { ...pin, x, y, visible };
}

/** Inverse: cropped-view coordinates to full-image coordinates. */
export function pinToFullSpace(coords: { x: number; y: number }, crop: CropRect): { x: number; y: number } {
  return {
    x: crop.x + (coords.x / 100) * crop.width,
    y: crop.y + (coords.y / 100) * crop.height,
  };
}

/** Dessine les pins sur l'image via Canvas et retourne un data URL PNG. */
export async function renderImageWithPins(base64: string, pins: ImagePin[], crop?: CropRect): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const natW = img.naturalWidth;
      const natH = img.naturalHeight;

      // Determine source region
      const sx = crop ? (crop.x / 100) * natW : 0;
      const sy = crop ? (crop.y / 100) * natH : 0;
      const sw = crop ? (crop.width / 100) * natW : natW;
      const sh = crop ? (crop.height / 100) * natH : natH;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64); return; }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const radius = Math.max(12, Math.min(24, canvas.width * 0.025));
      const fontSize = Math.round(radius * 0.9);

      // Filter and remap pins to cropped space
      const mappedPins = crop
        ? pins.map(p => pinToCroppedSpace(p, crop)).filter(p => p.visible)
        : pins.map(p => ({ ...p, visible: true }));

      for (const pin of mappedPins) {
        const cx = (pin.x / 100) * canvas.width;
        const cy = (pin.y / 100) * canvas.height;

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
