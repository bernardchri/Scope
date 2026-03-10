import { ImagePin } from './types';

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
