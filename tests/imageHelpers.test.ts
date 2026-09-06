import { describe, it, expect } from 'vitest';
import { pinToCroppedSpace, pinToFullSpace } from '@/lib/imageHelpers';
import type { CropRect, ImagePin } from '@/lib/types';

const crop: CropRect = { x: 20, y: 10, width: 40, height: 50 };

describe('pinToCroppedSpace / pinToFullSpace', () => {
  it('maps a pin inside the crop into cropped-view percentages', () => {
    const pin: ImagePin = { id: 'p1', number: 1, x: 40, y: 35 };
    const mapped = pinToCroppedSpace(pin, crop);
    expect(mapped.x).toBeCloseTo(50);
    expect(mapped.y).toBeCloseTo(50);
    expect(mapped.visible).toBe(true);
  });

  it('flags a pin outside the crop as not visible', () => {
    const pin: ImagePin = { id: 'p2', number: 2, x: 90, y: 90 };
    expect(pinToCroppedSpace(pin, crop).visible).toBe(false);
  });

  it('round-trips full → cropped → full', () => {
    const pin: ImagePin = { id: 'p3', number: 3, x: 33, y: 42 };
    const cropped = pinToCroppedSpace(pin, crop);
    const back = pinToFullSpace({ x: cropped.x, y: cropped.y }, crop);
    expect(back.x).toBeCloseTo(pin.x);
    expect(back.y).toBeCloseTo(pin.y);
  });
});
