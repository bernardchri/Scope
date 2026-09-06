import { describe, it, expect } from 'vitest';
import { getActiveWidgets, getAvailableWidgetTypes } from '@/lib/categoryHelpers';
import type { Component } from '@/lib/types';

function make(partial: Partial<Component>): Component {
  return { id: 'c1', name: 'x', category: 'component', tasks: [], instances: [], ...partial };
}

describe('getActiveWidgets', () => {
  it('falls back to the type defaults when widgets is undefined', () => {
    const widgets = getActiveWidgets(make({ category: 'component' }));
    expect(widgets.map(w => w.type)).toContain('images');
    expect(widgets.map(w => w.type)).toContain('tasks');
  });

  it('returns the explicit widget list when set', () => {
    const explicit = [{ id: 'w1', type: 'notes' as const }];
    expect(getActiveWidgets(make({ widgets: explicit }))).toBe(explicit);
  });
});

describe('getAvailableWidgetTypes', () => {
  it('keeps text widgets available but hides already-present singletons', () => {
    const available = getAvailableWidgetTypes([{ id: 'w1', type: 'images' }]);
    expect(available).not.toContain('images');
    expect(available).toContain('notes');
    expect(available).toContain('paragraph');
  });
});
