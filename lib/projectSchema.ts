import { z } from 'zod';
import type { CollectionField, Project } from './types';
import { migrateFonts } from './fonts';

/**
 * Schéma de validation défensive pour `scope.json`.
 *
 * Objectif : ne jamais planter sur un fichier légèrement corrompu ou produit par
 * une version future. Le schéma *répare* le maximum de choses (valeurs d'enum
 * inconnues ramenées à une valeur sûre, tableaux manquants → `[]`, entrées
 * invalides d'un tableau ignorées une à une, champs inattendus supprimés) et ne
 * rejette que si l'identité du projet est absente (`id` + `name`).
 */

/** Tableau tolérant : les éléments invalides sont ignorés au lieu de faire échouer tout le tableau. */
function resilientArray<T extends z.ZodTypeAny>(schema: T) {
  return z
    .array(z.unknown())
    .catch([])
    .transform((arr) => {
      const out: z.infer<T>[] = [];
      for (const el of arr) {
        const r = schema.safeParse(el);
        if (r.success) out.push(r.data);
      }
      return out;
    });
}

const pinRefSchema = z
  .object({
    imageId: z.string(),
    pinId: z.string(),
    pinNumber: z.number(),
  })
  .optional();

const imagePinSchema = z.object({
  id: z.string(),
  number: z.number().catch(0),
  x: z.number().catch(0),
  y: z.number().catch(0),
  label: z.string().optional(),
  figmaLayerId: z.string().optional(),
  kind: z.string().optional(),
  specs: z.record(z.string(), z.string()).optional(),
  note: z.string().optional(),
  noTask: z.boolean().optional(),
  collectionId: z.string().optional(),
  fieldRef: z.object({ collectionId: z.string(), fieldId: z.string() }).optional().catch(undefined),
});

const collectionFieldSchema: z.ZodType<CollectionField> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string().catch(''),
    kind: z.string().catch('text'),
    specs: z.record(z.string(), z.string()).optional(),
    relationTo: z.string().optional(),
    multiple: z.boolean().optional(),
    required: z.boolean().optional(),
    note: z.string().optional(),
    subFields: resilientArray(collectionFieldSchema).optional(),
  })
);

const collectionSchema = z.object({
  id: z.string(),
  name: z.string().catch(''),
  slug: z.string().catch(''),
  description: z.string().optional(),
  hasDetailPage: z.boolean().optional(),
  fields: resilientArray(collectionFieldSchema),
});

const cropRectSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  })
  .optional();

const componentImageSchema = z.object({
  id: z.string(),
  base64: z.string().optional(),
  filename: z.string().optional(),
  caption: z.string().optional(),
  isPrimary: z.boolean().catch(false),
  pins: resilientArray(imagePinSchema).optional(),
  crop: cropRectSchema,
  figmaNodeId: z.string().optional(),
  figmaWidth: z.number().optional(),
  figmaHeight: z.number().optional(),
});

const assetSchema = z.object({
  id: z.string(),
  name: z.string().catch(''),
  filename: z.string(),
  figmaLayerId: z.string().optional(),
});

const figmaLinkSchema = z
  .object({
    fileKey: z.string(),
    groupNodeId: z.string(),
    lastSyncAt: z.string().optional(),
  })
  .optional();

const taskSchema = z.object({
  id: z.string(),
  name: z.string().catch(''),
  completed: z.boolean().catch(false),
  category: z.enum(['frontend', 'backend', 'seo', 'motion']).catch('frontend'),
  scope: z.literal('v2').optional().catch(undefined),
  pinRef: pinRefSchema,
  auto: z.boolean().optional(),
});

const instanceSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  pinRef: pinRefSchema,
  autoFromFigma: z.boolean().optional(),
});

const widgetInstanceSchema = z.object({
  id: z.string(),
  type: z
    .enum(['notes', 'images', 'tasks', 'instances', 'resources', 'page', 'paragraph', 'heading1', 'heading2', 'heading3', 'bullet', 'comment'])
    .catch('notes'),
});

const noteDataSchema = z.object({
  id: z.string(),
  content: z.string().catch(''),
});

const pageSchema = z
  .object({
    route: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    collectionId: z.string().optional(),
    collectionRole: z.enum(['single', 'list']).optional().catch(undefined),
  })
  .optional();

const componentSchema = z.object({
  id: z.string(),
  name: z.string().catch(''),
  description: z.string().optional(),
  category: z.enum(['document', 'component', 'template', 'section']).catch('component'),
  images: resilientArray(componentImageSchema).optional(),
  assets: resilientArray(assetSchema).optional(),
  estimatedHours: z.number().optional(),
  notes: resilientArray(noteDataSchema).optional(),
  widgets: resilientArray(widgetInstanceSchema).optional(),
  instances: resilientArray(instanceSchema),
  tasks: resilientArray(taskSchema),
  figmaLink: figmaLinkSchema,
  page: pageSchema,
});

const tokenValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.object({ alias: z.string(), collection: z.string().catch('') }),
]);

const origin = z.literal('manual').optional().catch(undefined);

const fontSourceSchema = z.union([
  z.object({ kind: z.literal('google'), url: z.string().optional() }),
  z.object({ kind: z.literal('file'), filename: z.string(), weight: z.union([z.number(), z.literal('variable')]).catch(400), italic: z.boolean().catch(false) }),
]);

const tokensSchema = z
  .object({
    fileKey: z.string().optional(),
    fileName: z.string().optional(),
    syncedAt: z.string().optional(),
    collections: resilientArray(
      z.object({
        origin: origin,
        name: z.string().catch(''),
        defaultMode: z.string().catch(''),
        modes: z.array(z.string()).catch([]),
        manualModes: z.array(z.string()).optional(),
        variables: resilientArray(
          z.object({
            origin: origin,
            name: z.string(),
            type: z.string().catch('STRING'),
            description: z.string().optional(),
            values: z.record(z.string(), tokenValueSchema).catch({}),
          })
        ),
      })
    ),
    textStyles: resilientArray(
      z.object({
        origin: origin,
        name: z.string(),
        description: z.string().optional(),
        fontFamily: z.string().catch(''),
        fontRef: z.string().optional(),
        fontStyle: z.string().catch(''),
        fontSize: z.number().catch(16),
        lineHeight: z.object({ unit: z.enum(['AUTO', 'PIXELS', 'PERCENT']).catch('AUTO'), value: z.number().optional() }).catch({ unit: 'AUTO' }),
        letterSpacing: z.object({ unit: z.enum(['PIXELS', 'PERCENT']).catch('PIXELS'), value: z.number().catch(0) }).catch({ unit: 'PIXELS', value: 0 }),
        textCase: z.string().optional(),
        textDecoration: z.string().optional(),
        paragraphSpacing: z.number().optional(),
      })
    ),
    colorStyles: resilientArray(
      z.object({
        origin: origin,
        name: z.string(),
        description: z.string().optional(),
        paints: z.array(z.any()).catch([]),
      })
    ),
    // Polices déclarées ; l'ancien format (une entrée par source, sans `name`) est regroupé par `migrateFonts`.
    fonts: resilientArray(
      z.union([
        z.object({
          id: z.string(),
          name: z.string(),
          family: z.string(),
          fallback: z.enum(['sans-serif', 'serif', 'monospace']).optional().catch(undefined),
          sources: resilientArray(fontSourceSchema),
        }),
        z.object({ id: z.string(), family: z.string(), kind: z.literal('google'), url: z.string().optional() }),
        z.object({ id: z.string(), family: z.string(), kind: z.literal('file'), filename: z.string(), weight: z.union([z.number(), z.literal('variable')]).catch(400), italic: z.boolean().catch(false) }),
      ])
    ).optional(),
    effectStyles: resilientArray(
      z.object({
        origin: origin,
        name: z.string(),
        description: z.string().optional(),
        effects: z.array(z.any()).catch([]),
      })
    ),
  })
  .optional()
  .catch(undefined);

const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  filename: z.string().optional(),
  hourlyRate: z.number().optional(),
  budgetCap: z.number().optional(),
  version: z.string().optional(),
  client: z
    .object({
      name: z.string().optional(),
      url: z.string().optional(),
      contact: z.string().optional(),
    })
    .optional(),
  depositPercent: z.number().optional(),
  estimatedDelay: z.string().optional(),
  quoteValidityDays: z.number().optional(),
  components: resilientArray(componentSchema),
  collections: resilientArray(collectionSchema).optional(),
  tokens: tokensSchema,
  pinTasks: z.enum(['auto', 'off']).optional().catch(undefined),
  createdAt: z.string().catch(() => new Date().toISOString()),
  formatVersion: z.number().optional(),
});

export interface ParseResult {
  project: Project | null;
  /** Réparations ou anomalies notables détectées (vide si le fichier est sain). */
  issues: string[];
}

/**
 * Valide et répare un objet projet brut. `project` vaut `null` uniquement si
 * `id` ou `name` sont absents (fichier inexploitable).
 */
export function parseProject(raw: unknown): ParseResult {
  const result = projectSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `${i.path.join('.') || '(racine)'} : ${i.message}`
    );
    return { project: null, issues };
  }

  const issues: string[] = [];
  const raw0 = (raw ?? {}) as { components?: unknown };
  if (Array.isArray(raw0.components)) {
    const dropped = raw0.components.length - result.data.components.length;
    if (dropped > 0) issues.push(`${dropped} composant(s) invalide(s) ignoré(s)`);
  }

  const project = result.data as Project;
  if (project.tokens) project.tokens = migrateFonts(project.tokens);
  return { project, issues };
}
