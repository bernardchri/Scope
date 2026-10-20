export type ScopeItemType = 'document' | 'component' | 'template' | 'section';
export type ComponentCategory = ScopeItemType;

export type WidgetType =
  | 'notes' | 'images' | 'tasks' | 'instances' | 'resources' | 'page'
  | 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'comment';

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
  /** Pin « Liste » : collection dont la liste affiche les entrées. */
  collectionId?: string;
  /** Autre pin : champ de collection d'où vient la donnée affichée. */
  fieldRef?: { collectionId: string; fieldId: string };
}

/** Champ d'une collection (type de contenu), typé comme un pin. */
export interface CollectionField {
  id: string;
  name: string;
  /** Type du champ, voir lib/collections.ts. */
  kind: string;
  specs?: Record<string, string>;
  /** Champ « Relation » : collection pointée. */
  relationTo?: string;
  /** Relation vers plusieurs entrées (sinon une seule). */
  multiple?: boolean;
  required?: boolean;
  note?: string;
  /** Champ « Répéteur » : champs d'une ligne (peuvent eux-mêmes contenir un répéteur). */
  subFields?: CollectionField[];
}

/** Type de contenu du site (custom post type WordPress, collection Webflow…) : sa structure, pas ses entrées. */
export interface Collection {
  id: string;
  name: string;
  /** Identifiant technique (slug), ex. « projet ». */
  slug: string;
  description?: string;
  /** Chaque entrée a sa propre page de détail. */
  hasDetailPage?: boolean;
  fields: CollectionField[];
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
  /** Taille en px de la frame Figma d'origine (point de rupture d'une maquette desktop/mobile). */
  figmaWidth?: number;
  figmaHeight?: number;
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

/** Ce qu'un template affiche : adresse, métadonnées SEO et données (collection) qu'il met en scène. */
export interface PageInfo {
  /** Adresse de la page, ex. « / », « /ouvrages », « /ouvrages/:slug ». */
  route?: string;
  seoTitle?: string;
  seoDescription?: string;
  /** Collection affichée par la page. */
  collectionId?: string;
  /** « single » : fiche d'une entrée ; « list » : liste (archive) des entrées. */
  collectionRole?: 'single' | 'list';
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
  page?: PageInfo;
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
  /** Modèle de contenu du site. */
  collections?: Collection[];
  /** Variables et styles du document Figma (design tokens). */
  tokens?: DesignTokens;
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

// ─── Design tokens (variables et styles Figma) ────────────────────────────────

/** Valeur d'une variable pour un mode : couleur en hex, nombre, texte, booléen, ou alias vers une autre variable. */
export type TokenValue = string | number | boolean | { alias: string; collection: string };

/** Absent = reçu d'une source (plugin Figma…) ; « manual » = créé ou modifié dans SCOPE, protégé des synchronisations. */
export type TokenOrigin = 'manual';

export interface TokenVariable {
  origin?: TokenOrigin;
  name: string;
  /** COLOR, FLOAT, STRING ou BOOLEAN (types des variables Figma). */
  type: string;
  description?: string;
  /** Valeur par nom de mode. */
  values: Record<string, TokenValue>;
}

export interface TokenCollection {
  origin?: TokenOrigin;
  name: string;
  defaultMode: string;
  modes: string[];
  variables: TokenVariable[];
}

export interface TextStyleToken {
  origin?: TokenOrigin;
  name: string;
  description?: string;
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
  lineHeight: { unit: 'AUTO' | 'PIXELS' | 'PERCENT'; value?: number };
  letterSpacing: { unit: 'PIXELS' | 'PERCENT'; value: number };
  textCase?: string;
  textDecoration?: string;
  paragraphSpacing?: number;
}

export type PaintToken =
  | { type: 'SOLID'; color: string }
  | { type: string; stops: { position: number; color: string }[] };

export interface ColorStyleToken {
  origin?: TokenOrigin;
  name: string;
  description?: string;
  paints: PaintToken[];
}

export type EffectToken =
  | { type: 'DROP_SHADOW' | 'INNER_SHADOW'; color: string; x: number; y: number; blur: number; spread: number }
  | { type: string; blur: number };

export interface EffectStyleToken {
  origin?: TokenOrigin;
  name: string;
  description?: string;
  effects: EffectToken[];
}

/**
 * Variables et styles du projet. Ceux qui viennent d'une source (plugin Figma) sont remplacés à chaque envoi ;
 * ceux créés ou modifiés dans SCOPE (`origin: 'manual'`) sont conservés. SCOPE peut donc les porter seul.
 */
export interface DesignTokens {
  fileKey?: string;
  fileName?: string;
  /** Date du dernier envoi depuis une source ; absent si les tokens ne viennent que de SCOPE. */
  syncedAt?: string;
  collections: TokenCollection[];
  textStyles: TextStyleToken[];
  colorStyles: ColorStyleToken[];
  effectStyles: EffectStyleToken[];
}
