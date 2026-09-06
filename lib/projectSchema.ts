import { z } from 'zod';
import type { Project } from './types';

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
});

const taskSchema = z.object({
  id: z.string(),
  name: z.string().catch(''),
  completed: z.boolean().catch(false),
  category: z.enum(['frontend', 'backend', 'seo', 'motion']).catch('frontend'),
  pinRef: pinRefSchema,
});

const instanceSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  pinRef: pinRefSchema,
});

const widgetInstanceSchema = z.object({
  id: z.string(),
  type: z
    .enum(['notes', 'images', 'tasks', 'instances', 'paragraph', 'comment'])
    .catch('notes'),
});

const noteDataSchema = z.object({
  id: z.string(),
  content: z.string().catch(''),
});

const componentSchema = z.object({
  id: z.string(),
  name: z.string().catch(''),
  description: z.string().optional(),
  category: z.enum(['document', 'component', 'template', 'section']).catch('component'),
  images: resilientArray(componentImageSchema).optional(),
  estimatedHours: z.number().optional(),
  notes: resilientArray(noteDataSchema).optional(),
  widgets: resilientArray(widgetInstanceSchema).optional(),
  instances: resilientArray(instanceSchema),
  tasks: resilientArray(taskSchema),
});

const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  filename: z.string().optional(),
  hourlyRate: z.number().optional(),
  budgetCap: z.number().optional(),
  components: resilientArray(componentSchema),
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

  return { project: result.data as Project, issues };
}
