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

const cta = makeComponent({ id: 'comp-cta', name: 'CTA', category: 'component' });

describe('applyFigmaImport — pins', () => {
  it('crée une nouvelle image + pins pour un composant sans historique', async () => {
    const payload = basePayload({
      pins: [{ figmaLayerId: 'layer-1', label: 'CTA', componentId: 'comp-cta', x: 10, y: 20 }],
    });
    const result = await applyFigmaImport('/proj', payload, undefined, [cta]);

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
      pins: [{ figmaLayerId: 'layer-1', label: 'CTA (renommé)', componentId: 'comp-cta', x: 15, y: 25 }],
    });

    const result = await applyFigmaImport('/proj', payload, existing, [cta]);
    const image = result.componentUpdates.images!.find((i) => i.id === 'img-1')!;

    // pin-a garde son id (préserve un pinRef éventuel), position/label mis à jour
    const updated = image.pins!.find((p) => p.id === 'pin-a');
    expect(updated).toMatchObject({ label: 'CTA', x: 15, y: 25 });

    // pin-b (orphelin) reste présent tant qu'on ne confirme pas sa suppression
    expect(image.pins!.some((p) => p.id === 'pin-b')).toBe(true);
    expect(result.orphanedPins).toEqual([expect.objectContaining({ id: 'pin-b' })]);
  });
});

describe('dropOrphanedPins', () => {
  it('retire uniquement les pins choisis, sur la bonne image', async () => {
    const payload = basePayload({
      pins: [{ figmaLayerId: 'layer-1', label: 'CTA', componentId: 'comp-cta', x: 10, y: 20 }],
    });
    const result = await applyFigmaImport('/proj', payload, undefined, [cta]);
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

describe('applyFigmaImport — pins de composants → ComponentInstance', () => {
  const button = makeComponent({
    id: 'comp-button', name: 'Bouton', category: 'component',
    figmaLink: { fileKey: 'file-1', groupNodeId: 'figma-button-set' },
  });
  const card = makeComponent({ id: 'comp-card', name: 'Carte', category: 'component' });

  it('crée un pin par occurrence et une instance reliée (match par lien Figma)', async () => {
    const payload = basePayload({
      pins: [
        { figmaLayerId: 'inst-1', label: 'Button', groupNodeId: 'figma-button-set', x: 10, y: 20 },
        { figmaLayerId: 'inst-2', label: 'Button', groupNodeId: 'figma-button-set', x: 60, y: 80 },
      ],
    });

    const result = await applyFigmaImport('/proj', payload, undefined, [button]);
    const image = result.componentUpdates.images![0];

    expect(image.pins).toEqual([
      expect.objectContaining({ figmaLayerId: 'inst-1', label: 'Bouton', x: 10, y: 20, number: 1 }),
      expect.objectContaining({ figmaLayerId: 'inst-2', label: 'Bouton', x: 60, y: 80, number: 2 }),
    ]);
    const instances = result.componentUpdates.instances!;
    expect(instances).toHaveLength(2);
    instances.forEach((inst, i) => {
      expect(inst).toMatchObject({
        componentId: 'comp-button',
        autoFromFigma: true,
        pinRef: { imageId: image.id, pinId: image.pins![i].id, pinNumber: image.pins![i].number },
      });
    });
  });

  it('le composant choisi dans le plugin (componentId) prime sur le lien Figma', async () => {
    const payload = basePayload({
      pins: [{ figmaLayerId: 'inst-1', label: 'Button', groupNodeId: 'figma-button-set', componentId: 'comp-card', x: 10, y: 20 }],
    });
    const result = await applyFigmaImport('/proj', payload, undefined, [button, card]);
    expect(result.componentUpdates.images![0].pins![0].label).toBe('Carte');
    expect(result.componentUpdates.instances).toEqual([expect.objectContaining({ componentId: 'comp-card' })]);
  });

  it('ignore un composant absent de SCOPE : ni pin, ni numéro consommé', async () => {
    const payload = basePayload({
      pins: [
        { figmaLayerId: 'inst-0', label: 'Inconnu', groupNodeId: 'figma-unknown-set', x: 5, y: 5 },
        { figmaLayerId: 'inst-1', label: 'Button', groupNodeId: 'figma-button-set', x: 10, y: 20 },
      ],
    });
    const result = await applyFigmaImport('/proj', payload, undefined, [button]);
    expect(result.componentUpdates.instances).toHaveLength(1);
    expect(result.componentUpdates.images![0].pins).toEqual([
      expect.objectContaining({ figmaLayerId: 'inst-1', number: 1 }),
    ]);
  });

  it("au re-sync : garde le pin existant, régénère les instances auto de cette image seulement", async () => {
    const existingTemplate = makeComponent({
      images: [
        {
          id: 'img-desktop', filename: 'd.png', isPrimary: true, figmaNodeId: 'node-1',
          pins: [{ id: 'pin-a', number: 3, x: 5, y: 5, figmaLayerId: 'inst-1', label: 'Bouton' }],
        },
        { id: 'img-mobile', filename: 'm.png', isPrimary: false, figmaNodeId: 'node-mobile' },
      ],
      instances: [
        { id: 'manual-1', componentId: 'comp-other' }, // ajoutée à la main, pas de flag
        { id: 'auto-desktop', componentId: 'comp-button', autoFromFigma: true,
          pinRef: { imageId: 'img-desktop', pinId: 'pin-a', pinNumber: 3 } },
        { id: 'auto-mobile', componentId: 'comp-button', autoFromFigma: true,
          pinRef: { imageId: 'img-mobile', pinId: 'pin-m', pinNumber: 1 } },
        { id: 'auto-legacy', componentId: 'comp-button', autoFromFigma: true }, // ancien import sans pin
      ],
    });

    const payload = basePayload({
      pins: [{ figmaLayerId: 'inst-1', label: 'Button', groupNodeId: 'figma-button-set', x: 15, y: 25 }],
    });
    const result = await applyFigmaImport('/proj', payload, existingTemplate, [button]);

    const desktop = result.componentUpdates.images!.find((i) => i.id === 'img-desktop')!;
    expect(desktop.pins).toEqual([expect.objectContaining({ id: 'pin-a', number: 3, x: 15, y: 25 })]);

    const ids = result.componentUpdates.instances!.map((i) => i.id);
    expect(ids).toContain('manual-1');
    expect(ids).toContain('auto-mobile');
    expect(ids).not.toContain('auto-desktop');
    expect(ids).not.toContain('auto-legacy');

    const regenerated = result.componentUpdates.instances!.filter(
      (i) => i.autoFromFigma && i.pinRef?.imageId === 'img-desktop'
    );
    expect(regenerated).toEqual([
      expect.objectContaining({ componentId: 'comp-button', pinRef: { imageId: 'img-desktop', pinId: 'pin-a', pinNumber: 3 } }),
    ]);
  });

  it("ne relie pas un composant à lui-même", async () => {
    const self = makeComponent({ figmaLink: { fileKey: 'f', groupNodeId: 'group-1' } });
    const payload = basePayload({
      pins: [{ figmaLayerId: 'inst-1', label: 'Self', groupNodeId: 'group-1', x: 10, y: 20 }],
    });
    const result = await applyFigmaImport('/proj', payload, self, [self]);
    expect(result.componentUpdates.instances).toEqual([]);
  });
});
