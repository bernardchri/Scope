import { ComponentImage } from './types';

export interface AvailablePin {
  pinId: string;
  imageId: string;
  imageIndex: number;
  imageCaption?: string;
  number: number;
}

/** Construit la liste plate de tous les pins disponibles sur un ensemble d'images. */
export function computeAvailablePins(images: ComponentImage[]): AvailablePin[] {
  return images.flatMap((img, imageIndex) =>
    (img.pins ?? []).map(pin => ({
      pinId: pin.id,
      imageId: img.id,
      imageIndex,
      imageCaption: img.caption,
      number: pin.number,
    }))
  );
}

/** Encode un pin en valeur de Select : "imageId::pinId". */
export function formatPinSelectValue(imageId: string, pinId: string): string {
  return `${imageId}::${pinId}`;
}

/** Décode une valeur de Select en { imageId, pinId }, ou null si 'none'. */
export function parsePinSelectValue(value: string): { imageId: string; pinId: string } | null {
  if (value === 'none') return null;
  const idx = value.indexOf('::');
  if (idx === -1) return null;
  return { imageId: value.slice(0, idx), pinId: value.slice(idx + 2) };
}
