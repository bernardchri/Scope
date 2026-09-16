import { describe, it, expect, vi } from 'vitest';
import type { Component } from '@/lib/types';
import type { FigmaImportPayload } from '@/lib/figmaImport';

vi.mock('@/lib/imageManager', () => ({
  saveImageFromBase64: vi.fn().mockResolvedValue('new-image.png'),
  deleteImage: vi.fn().mockResolvedValue(undefined),
}));

const { applyFigmaImport, dropOrphanedPins } = await import('@/lib/figmaImport');

function basePayload(overrides: Partial<FigmaImportPayload> = {}): FigmaImportPayload {
  return {
    name: 'Header',
    category: 'template',
    fileKey: 'file-1',
    groupNodeId: 'group-1',
    nodeId: 'node-1',
    image: 'YQ==',
    pins: [],
    ...overrides,
  };
}

function makeComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: 'comp-1',
    name: 'Header',
    category: 'template',
    instances: [],
    tasks: [],
    ...overrides,
  };
}

describe('applyFigmaImport — pins', () => {
  it('crée une nouvelle image + pins pour un composant sans historique', async () => {
    const payload = basePayload({
      pins: [{ figmaLayerId: 'layer-1', label: 'CTA', x: 10, y: 20 }],
    });
    const result = await applyFigmaImport('/proj', payload);

    expect(result.componentUpdates.images).toHaveLength(1);
    const image = result.componentUpdates.images![0];
    expect(image.filename).toBe('new-image.png');
    expect(image.isPrimary).toBe(true);
    expect(image.pins).toEqual([
      expect.objectContaining({ figmaLayerId: 'layer-1', label: 'CTA', x: 10, y: 20, number: 1 }),
    ]);
    expect(result.orphanedPins).toEqual([]);
  });

  it('préserve id/pinRef des pins matchés par figmaLayerId au re-sync, détecte les orphelins', async () => {
    const existingImage = {
      id: 'img-1',
      filename: 'old.png',
      isPrimary: true,
      figmaNodeId: 'node-1',
      pins: [
        { id: 'pin-a', number: 1, x: 5, y: 5, figmaLayerId: 'layer-1', label: 'CTA' },
        { id: 'pin-b', number: 2, x: 50, y: 50, figmaLayerId: 'layer-gone', label: 'Ancien' },
      ],
    };
    const existing = makeComponent({ images: [existingImage] });

    const payload = basePayload({
      pins: [{ figmaLayerId: 'layer-1', label: 'CTA (renommé)', x: 15, y: 25 }],
    });

    const result = await applyFigmaImport('/proj', payload, existing);
    const image = result.componentUpdates.images!.find((i) => i.id === 'img-1')!;

    // pin-a garde son id (préserve un pinRef éventuel), position/label mis à jour
    const updated = image.pins!.find((p) => p.id === 'pin-a');
    expect(updated).toMatchObject({ label: 'CTA (renommé)', x: 15, y: 25 });

    // pin-b (orphelin) reste présent tant qu'on ne confirme pas sa suppression
    expect(image.pins!.some((p) => p.id === 'pin-b')).toBe(true);
    expect(result.orphanedPins).toEqual([expect.objectContaining({ id: 'pin-b' })]);
  });
});

describe('dropOrphanedPins', () => {
  it('retire uniquement les pins choisis, sur la bonne image', async () => {
    const payload = basePayload({
      pins: [{ figmaLayerId: 'layer-1', label: 'CTA', x: 10, y: 20 }],
    });
    const result = await applyFigmaImport('/proj', payload);
    const withOrphan = {
      ...result.componentUpdates,
      images: [
        {
          ...result.componentUpdates.images![0],
          pins: [
            ...(result.componentUpdates.images![0].pins || []),
            { id: 'orphan-1', number: 99, x: 0, y: 0, label: 'Vieux' },
          ],
        },
      ],
    };
    const cleaned = dropOrphanedPins(withOrphan, result.imageId, ['orphan-1']);
    expect(cleaned.images![0].pins!.some((p) => p.id === 'orphan-1')).toBe(false);
    expect(cleaned.images![0].pins!.length).toBe(1);
  });
});

describe('applyFigmaImport — usedComponentIds → ComponentInstance', () => {
  it('relie automatiquement un composant déjà importé (figmaLink.groupNodeId matché)', async () => {
    const headerComponent = makeComponent({
      id: 'comp-button', name: 'Bouton', category: 'component',
      figmaLink: { fileKey: 'file-1', groupNodeId: 'figma-button-set' },
    });
    const payload = basePayload({ usedComponentIds: ['figma-button-set'] });

    const result = await applyFigmaImport('/proj', payload, undefined, [headerComponent]);

    expect(result.componentUpdates.instances).toEqual([
      expect.objectContaining({ componentId: 'comp-button', autoFromFigma: true }),
    ]);
  });

  it('ignore silencieusement un composant Figma pas encore importé dans SCOPE', async () => {
    const payload = basePayload({ usedComponentIds: ['figma-unknown-set'] });
    const result = await applyFigmaImport('/proj', payload, undefined, []);
    expect(result.componentUpdates.instances).toEqual([]);
  });

  it('remplace les instances auto au re-sync sans dupliquer, garde les instances manuelles', async () => {
    const button = makeComponent({ id: 'comp-button', figmaLink: { fileKey: 'f', groupNodeId: 'set-button' } });
    const existingTemplate = makeComponent({
      instances: [
        { id: 'manual-1', componentId: 'comp-other' }, // ajoutée à la main, pas de flag
        { id: 'auto-old', componentId: 'comp-button', autoFromFigma: true },
      ],
    });

    const payload = basePayload({ usedComponentIds: ['set-button'] });
    const result = await applyFigmaImport('/proj', payload, existingTemplate, [button]);

    const instances = result.componentUpdates.instances!;
    expect(instances).toHaveLength(2);
    expect(instances.find((i) => i.id === 'manual-1')).toBeTruthy();
    expect(instances.filter((i) => i.autoFromFigma)).toHaveLength(1);
    expect(instances.find((i) => i.id === 'auto-old')).toBeFalsy(); // régénérée, pas la même instance
  });
});
