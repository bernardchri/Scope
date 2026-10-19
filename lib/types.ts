export type ScopeItemType = 'document' | 'component' | 'template' | 'section';
export type ComponentCategory = ScopeItemType;

export type WidgetType = 'notes' | 'images' | 'tasks' | 'instances' | 'resources' | 'paragraph' | 'comment';

export interface WidgetInstance {
  id: string;
  type: WidgetType;
}

export interface NoteData {
  id: string;
  content: string;
}

export type TaskCategory = 'frontend' | 'backend' | 'seo' | 'motion';

export interface ComponentInstance {
  id: string;
  componentId: string;
  pinRef?: { imageId: string; pinId: string; pinNumber: number };
  /**
   * true si créé automatiquement lors d'un import Figma (instance de
   * composant détectée sur la page). Recalculé à chaque re-sync à partir
   * des pins courants — ne pas s'appuyer dessus pour une instance ajoutée
   * à la main, même si elle a aussi un pinRef.
   */
  autoFromFigma?: boolean;
}

export interface Task {
  id: string;
  name: string;
  completed: boolean;
  category: TaskCategory;
  /** 'v2' = hors périmètre / évolution : exclu du chiffrage, listé à part dans les exports. */
  scope?: 'v2';
  pinRef?: { imageId: string; pinId: string; pinNumber: number };
}

export interface ImagePin {
  id: string;
  number: number;
  x: number; // % 0-100
  y: number; // % 0-100
  /** Nom donné au calque Figma correspondant, si le pin vient d'un import Figma. */
  label?: string;
  /** id du calque Figma d'origine, utilisé pour le matching lors d'un re-sync. */
  figmaLayerId?: string;
  /** Type d'élément (titre, texte, image…), voir lib/pinKinds.ts. */
  kind?: string;
  /** Spécifications propres au type (longueur max, balise SEO…), clé = id du champ. */
  specs?: Record<string, string>;
  /** Précision libre, exportée avec le pin. */
  note?: string;
}

export interface CropRect {
  x: number;      // left edge, % (0-100) of total width
  y: number;      // top edge, % (0-100) of total height
  width: number;  // crop width, % (0-100)
  height: number; // crop height, % (0-100)
}

export interface ComponentImage {
  id: string;
  base64?: string;
  filename?: string;
  caption?: string;
  isPrimary: boolean;
  pins?: ImagePin[];
  crop?: CropRect;
  /** id du node Figma dont cette image est issue, si importée. */
  figmaNodeId?: string;
  /** Transitoire (export PDF) : largeur native en px, pour ne pas agrandir une petite image. */
  pdfWidth?: number;
}

/** Élément SVG extrait d'un calque Figma (flèche, icône…), fichier dans img/. */
export interface ComponentAsset {
  id: string;
  name: string;
  filename: string;
  /** id du calque Figma d'origine, clé de fusion entre deux syncs. */
  figmaLayerId?: string;
}

/** Lien vers un composant/frame Figma, pour import initial et re-sync ultérieur. */
export interface FigmaLink {
  fileKey: string;
  /** Id du component set (ou du node lui-même hors variant) — stable entre tous les états. */
  groupNodeId: string;
  lastSyncAt?: string;
}

export interface Component {
  id: string;
  name: string;
  description?: string;
  category: ScopeItemType;

  images?: ComponentImage[];
  /** SVG extraits de Figma, exportés dans le dossier d'items du Markdown. */
  assets?: ComponentAsset[];

  estimatedHours?: number;
  notes?: NoteData[];
  widgets?: WidgetInstance[];
  instances: ComponentInstance[];
  tasks: Task[];
  figmaLink?: FigmaLink;
}

export interface ClientInfo {
  name?: string;
  url?: string;
  contact?: string; // email ou nom du contact
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  filename?: string;
  hourlyRate?: number;
  budgetCap?: number;
  version?: string; // ex : "v1.0" — affiché sur la page de garde PDF
  client?: ClientInfo;
  // Conditions de devis
  depositPercent?: number;   // acompte à la commande, en % (ex : 30)
  estimatedDelay?: string;   // délai indicatif, texte libre (ex : "6 à 8 semaines")
  quoteValidityDays?: number; // durée de validité du devis, en jours (ex : 30)
  components: Component[];
  createdAt: string;
  formatVersion?: number; // 2 = folder format
}

export interface AppSettings {
  studioName?: string;
  pdf: {
    showEstimations: boolean;
  };
  markdown: {
    multiFile: boolean;
  };
  comment: {
    exportComments: boolean;
  };
  /** Estimation (heures) appliquée à la création d'un élément, par type. Absent = aucune. */
  defaultEstimates?: Partial<Record<ScopeItemType, number>>;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  studioName: '',
  pdf: { showEstimations: true },
  markdown: { multiFile: false },
  comment: { exportComments: false },
  defaultEstimates: {},
};
