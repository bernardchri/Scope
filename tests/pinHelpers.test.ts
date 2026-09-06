import { describe, it, expect } from 'vitest';
import {
  computeAvailablePins,
  formatPinSelectValue,
  parsePinSelectValue,
} from '@/lib/pinHelpers';
import type { ComponentImage } from '@/lib/types';

describe('computeAvailablePins', () => {
  it('flattens pins across images with their index and caption', () => {
    const images: ComponentImage[] = [
      { id: 'img1', isPrimary: true, caption: 'Accueil', pins: [{ id: 'a', number: 1, x: 0, y: 0 }] },
      { id: 'img2', isPrimary: false, pins: [{ id: 'b', number: 2, x: 0, y: 0 }, { id: 'c', number: 3, x: 0, y: 0 }] },
      { id: 'img3', isPrimary: false },
    ];
    const pins = computeAvailablePins(images);
    expect(pins).toHaveLength(3);
    expect(pins[0]).toMatchObject({ pinId: 'a', imageId: 'img1', imageIndex: 0, imageCaption: 'Accueil', number: 1 });
    expect(pins[2]).toMatchObject({ pinId: 'c', imageId: 'img2', imageIndex: 1, number: 3 });
  });
});

describe('formatPinSelectValue / parsePinSelectValue', () => {
  it('round-trips an imageId/pinId pair', () => {
    const value = formatPinSelectValue('img-1', 'pin-9');
    expect(value).toBe('img-1::pin-9');
    expect(parsePinSelectValue(value)).toEqual({ imageId: 'img-1', pinId: 'pin-9' });
  });

  it('returns null for the "none" sentinel and malformed values', () => {
    expect(parsePinSelectValue('none')).toBeNull();
    expect(parsePinSelectValue('garbage')).toBeNull();
  });
});
