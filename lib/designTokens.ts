import { fontCssName, fontCssValue, fontForStyle, googleFontsUrl } from './fonts';
import {
  ColorStyleToken, DesignTokens, EffectStyleToken, TextStyleToken, TokenCollection, TokenValue, TokenVariable,
} from './types';

const slug = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Variables dont le nombre est une dimension en pixels (Figma ne stocke pas l'unité d'un FLOAT). */
const PIXEL_NAME = /(space|spacing|size|radius|gap|width|height|padding|margin|border|stroke|blur|font-size|line-height|breakpoint)/i;

const WEIGHTS: [RegExp, number][] = [
  [/thin|hairline/i, 100], [/extra\s*light|ultra\s*light/i, 200], [/light/i, 300], [/medium/i, 500],
  [/semi\s*bold|demi\s*bold/i, 600], [/extra\s*bold|ultra\s*bold/i, 800], [/black|heavy/i, 900], [/bold/i, 700],
];

/** Graisse CSS d'un style de police Figma (« Semi Bold Italic » → 600). */
export function fontWeight(fontStyle: string): number {
  return WEIGHTS.find(([pattern]) => pattern.test(fontStyle))?.[1] ?? 400;
}

export const isItalic = (fontStyle: string) => /italic|oblique/i.test(fontStyle);

/** Graisses proposées dans l'éditeur de styles de texte. */
export const WEIGHT_NAMES: [number, string][] = [
  [100, 'Thin'], [200, 'Extra Light'], [300, 'Light'], [400, 'Regular'], [500, 'Medium'],
  [600, 'Semi Bold'], [700, 'Bold'], [800, 'Extra Bold'], [900, 'Black'],
];

/** Nom de style de police Figma pour une graisse CSS (« 600 », italique → « Semi Bold Italic »). */
export function fontStyleName(weight: number, italic: boolean): string {
  const name = WEIGHT_NAMES.find(([w]) => w === weight)?.[1] ?? 'Regular';
  return italic ? `${name} Italic` : name;
}
const aliasKey = (collection: string, name: string) => `${collection}/${name}`;

/** Remplace une valeur « -0 » ou à virgule flottante bruyante par un nombre lisible. */
const num = (n: number) => String(Math.round(n * 1000) / 1000);

/**
 * Nom de propriété CSS de chaque variable (`--color-primary`). Deux variables de même nom dans des collections
 * différentes sont préfixées par leur collection, pour ne pas se masquer.
 */
export function variableCssNames(collections: TokenCollection[]): Map<string, string> {
  const count = new Map<string, number>();
  for (const c of collections) for (const v of c.variables) count.set(slug(v.name), (count.get(slug(v.name)) ?? 0) + 1);
  const names = new Map<string, string>();
  for (const c of collections) {
    for (const v of c.variables) {
      const base = slug(v.name);
      names.set(aliasKey(c.name, v.name), `--${(count.get(base) ?? 0) > 1 ? `${slug(c.name)}-` : ''}${base}`);
    }
  }
  return names;
}

function cssValue(variable: TokenVariable, value: TokenValue, names: Map<string, string>): string | null {
  if (typeof value === 'object') {
    const target = names.get(aliasKey(value.collection, value.alias));
    return target ? `var(${target})` : null;
  }
  if (typeof value === 'boolean') return null;
  if (typeof value === 'number') return PIXEL_NAME.test(variable.name) ? `${num(value)}px` : num(value);
  return variable.type === 'COLOR' ? value : JSON.stringify(value);
}

function lineHeightCss(style: TextStyleToken): string | undefined {
  const { unit, value } = style.lineHeight;
  if (unit === 'PIXELS' && value !== undefined) return `${num(value)}px`;
  if (unit === 'PERCENT' && value !== undefined) return num(value / 100);
  return undefined; // AUTO : interligne propre à la police
}

function letterSpacingCss(style: TextStyleToken): string | undefined {
  const { unit, value } = style.letterSpacing;
  if (!value) return undefined;
  return unit === 'PERCENT' ? `${num(value / 100)}em` : `${num(value)}px`;
}

const CASES: Record<string, string> = { UPPER: 'uppercase', LOWER: 'lowercase', TITLE: 'capitalize' };

/** Styles de texte du plus grand au plus petit (à taille égale, ordre d'origine) : ordre des aperçus et des exports. */
export const bySizeDesc = <T extends { fontSize: number }>(styles: T[]): T[] => [...styles].sort((a, b) => b.fontSize - a.fontSize);

/** Déclarations CSS d'un style de texte. */
export function textStyleDeclarations(style: TextStyleToken, fontFamily?: string): string[] {
  return [
    `font-family: ${fontFamily ?? `${JSON.stringify(style.fontFamily)}, sans-serif`}`,
    `font-size: ${num(style.fontSize)}px`,
    `font-weight: ${fontWeight(style.fontStyle)}`,
    isItalic(style.fontStyle) ? 'font-style: italic' : '',
    lineHeightCss(style) ? `line-height: ${lineHeightCss(style)}` : '',
    letterSpacingCss(style) ? `letter-spacing: ${letterSpacingCss(style)}` : '',
    style.textCase && CASES[style.textCase] ? `text-transform: ${CASES[style.textCase]}` : '',
    style.textDecoration === 'UNDERLINE' ? 'text-decoration: underline' : style.textDecoration === 'STRIKETHROUGH' ? 'text-decoration: line-through' : '',
  ].filter(Boolean);
}

function paintCss(paints: ColorStyleToken['paints']): string | undefined {
  const first = paints[0];
  if (!first) return undefined;
  if (first.type === 'SOLID' && 'color' in first) return first.color;
  if ('stops' in first) {
    const stops = first.stops.map(s => `${s.color} ${num(s.position * 100)}%`).join(', ');
    return first.type === 'GRADIENT_RADIAL' ? `radial-gradient(circle, ${stops})` : `linear-gradient(to right, ${stops})`;
  }
  return undefined;
}

function effectCss(style: EffectStyleToken): { property: string; value: string } | undefined {
  const shadows = style.effects.filter((e): e is Extract<typeof e, { color: string }> => 'color' in e);
  if (shadows.length) {
    const value = shadows
      .map(s => `${s.type === 'INNER_SHADOW' ? 'inset ' : ''}${num(s.x)}px ${num(s.y)}px ${num(s.blur)}px ${num(s.spread)}px ${s.color}`)
      .join(', ');
    return { property: `--shadow-${slug(style.name)}`, value };
  }
  const blur = style.effects.find(e => 'blur' in e);
  return blur && 'blur' in blur ? { property: `--blur-${slug(style.name)}`, value: `${num(blur.blur)}px` } : undefined;
}

/** Feuille de styles : variables par mode, styles de couleur et d'effet en variables, styles de texte en classes. */
export function tokensToCss(tokens: DesignTokens): string {
  const names = variableCssNames(tokens.collections);
  const fonts = tokens.fonts ?? [];
  const blocks: string[] = [
    // @import doit précéder toute règle.
    ...fonts.flatMap(f => f.sources.filter(s => s.kind === 'google').map(s => `@import url('${s.url ?? googleFontsUrl(f.family)}');`)),
    `/* Design tokens — ${tokenSource(tokens)} */`,
    ...fonts.flatMap(f => f.sources.filter(s => s.kind === 'file').map(s => `/* Police « ${f.family} » : fichier \`fonts/${s.filename}\` du projet SCOPE, à fournir avec le site. */`)),
  ];

  const root: string[] = [];
  // Polices déclarées une fois : les classes de texte y renvoient par var(--font-…).
  for (const font of fonts) root.push(`  ${fontCssName(font)}: ${fontCssValue(font)};`);
  const modeBlocks = new Map<string, string[]>();
  for (const collection of tokens.collections) {
    const defaultMode = collection.defaultMode || collection.modes[0];
    root.push(`  /* ${collection.name} */`);
    for (const variable of collection.variables) {
      const property = names.get(aliasKey(collection.name, variable.name))!;
      const base = cssValue(variable, variable.values[defaultMode], names);
      if (base !== null && variable.values[defaultMode] !== undefined) root.push(`  ${property}: ${base};`);
      for (const mode of collection.modes.filter(m => m !== defaultMode)) {
        const value = variable.values[mode];
        const css = value === undefined ? null : cssValue(variable, value, names);
        if (css !== null && css !== base) {
          const selector = `[data-mode="${slug(mode)}"]`;
          modeBlocks.set(selector, [...(modeBlocks.get(selector) ?? []), `  ${property}: ${css};`]);
        }
      }
    }
  }
  for (const style of tokens.colorStyles) {
    const value = paintCss(style.paints);
    if (value) root.push(`  --color-style-${slug(style.name)}: ${value};`);
  }
  for (const style of tokens.effectStyles) {
    const effect = effectCss(style);
    if (effect) root.push(`  ${effect.property}: ${effect.value};`);
  }
  if (root.length) blocks.push(`:root {\n${root.join('\n')}\n}`);
  for (const [selector, lines] of modeBlocks) blocks.push(`${selector} {\n${lines.join('\n')}\n}`);

  for (const style of bySizeDesc(tokens.textStyles)) {
    const font = fontForStyle(tokens, style);
    blocks.push(`.text-${slug(style.name)} {\n${textStyleDeclarations(style, font ? `var(${fontCssName(font)})` : undefined).map(d => `  ${d};`).join('\n')}\n}`);
  }
  return blocks.join('\n\n') + '\n';
}

type Tree = { [key: string]: Tree | unknown };

function put(tree: Tree, path: string, leaf: unknown) {
  const keys = path.split('/').map(k => k.trim()).filter(Boolean);
  let node = tree;
  keys.slice(0, -1).forEach(key => { node = (node[key] = (node[key] as Tree) ?? {}) as Tree; });
  node[keys[keys.length - 1] ?? path] = leaf;
}

const DTCG_TYPES: Record<string, string> = { COLOR: 'color', FLOAT: 'number', STRING: 'string', BOOLEAN: 'boolean' };

/**
 * Tokens au format Design Tokens (`$type` / `$value`), regroupés par collection puis par mode ;
 * les noms Figma `color/primary` deviennent des groupes imbriqués, les alias `{color.primary}`.
 */
export function tokensToJson(tokens: DesignTokens) {
  const variables: Record<string, Record<string, Tree>> = {};
  for (const collection of tokens.collections) {
    variables[collection.name] = {};
    for (const mode of collection.modes) {
      const tree: Tree = {};
      for (const variable of collection.variables) {
        const value = variable.values[mode];
        if (value === undefined) continue;
        const resolved = typeof value === 'object'
          ? `{${(value.collection && value.collection !== collection.name ? `${value.collection}.` : '') + value.alias.split('/').join('.')}}`
          : value;
        put(tree, variable.name, {
          $type: DTCG_TYPES[variable.type] ?? 'string',
          $value: resolved,
          ...(variable.description ? { $description: variable.description } : {}),
        });
      }
      variables[collection.name][mode] = tree;
    }
  }

  const fontFamilies: Tree = {};
  for (const font of tokens.fonts ?? []) {
    put(fontFamilies, font.name, { $type: 'fontFamily', $value: [font.family, font.fallback ?? 'sans-serif'] });
  }
  const textStyles: Tree = {};
  for (const style of tokens.textStyles) {
    const font = fontForStyle(tokens, style);
    put(textStyles, style.name, {
      $type: 'typography',
      $value: {
        fontFamily: font ? `{fonts.${font.name}}` : style.fontFamily,
        fontWeight: fontWeight(style.fontStyle),
        fontSize: `${num(style.fontSize)}px`,
        lineHeight: lineHeightCss(style) ?? 'normal',
        letterSpacing: letterSpacingCss(style) ?? 'normal',
        ...(style.textCase && CASES[style.textCase] ? { textTransform: CASES[style.textCase] } : {}),
      },
      ...(style.description ? { $description: style.description } : {}),
    });
  }
  const colorStyles: Tree = {};
  for (const style of tokens.colorStyles) {
    const value = paintCss(style.paints);
    if (value) put(colorStyles, style.name, { $type: 'color', $value: value });
  }
  const effectStyles: Tree = {};
  for (const style of tokens.effectStyles) {
    const effect = effectCss(style);
    if (effect) put(effectStyles, style.name, { $type: 'shadow', $value: effect.value });
  }
  return { $description: `Design tokens — ${tokenSource(tokens)}`, variables, fonts: fontFamilies, textStyles, colorStyles, effectStyles };
}

const cell = (text: string) => text.replace(/\|/g, '\\|');

function displayValue(value: TokenValue | undefined): string {
  if (value === undefined) return '—';
  if (typeof value === 'object') return `→ \`${value.alias}\``;
  return `\`${value}\``;
}

/** Les tokens contiennent-ils quelque chose à documenter (variables, polices, styles) ? */
export function hasTokensContent(tokens: DesignTokens | undefined): tokens is DesignTokens {
  return !!tokens && (tokens.collections.some(c => c.variables.length) || tokens.textStyles.length > 0 || tokens.colorStyles.length > 0
    || tokens.effectStyles.length > 0 || (tokens.fonts?.length ?? 0) > 0);
}

/** Caractéristiques d'un style de texte, en texte : taille, graisse, interligne, espacement des lettres. */
export function textStyleSpecs(style: TextStyleToken) {
  return {
    size: `${num(style.fontSize)} px`,
    weight: `${fontWeight(style.fontStyle)}${isItalic(style.fontStyle) ? ' italique' : ''}`,
    lineHeight: lineHeightCss(style) ?? 'auto',
    letterSpacing: letterSpacingCss(style) ?? '—',
  };
}

/** Section Markdown « Design tokens » : tableaux lisibles par un humain ou une IA (vide s'il n'y a rien). */
export function tokensToMarkdown(tokens: DesignTokens | undefined, heading = '##'): string {
  if (!hasTokensContent(tokens)) return '';
  const names = variableCssNames(tokens.collections);
  const lines: string[] = [
    `${heading} Design tokens`,
    '',
    `Variables et styles ${tokenSource(tokens)}. ` +
      'Les fichiers `tokens.json` (format Design Tokens) et `tokens.css` (variables CSS et classes `.text-*`) sont fournis à côté de ce document : à utiliser tels quels plutôt que de relever les valeurs sur les images.',
    '',
  ];

  for (const collection of tokens.collections.filter(c => c.variables.length)) {
    lines.push(`${heading}# Variables — ${collection.name}${collection.modes.length > 1 ? ` (modes : ${collection.modes.map(m => m === (collection.defaultMode || collection.modes[0]) ? `${m} — par défaut` : m).join(', ')})` : ''}`, '');
    if (collection.modes.length > 1) {
      const base = collection.defaultMode || collection.modes[0];
      lines.push(
        `Plusieurs modes (thèmes) : « ${base} » s'applique par défaut (\`:root\`) ; les autres s'activent en posant l'attribut sur \`<html>\` ou sur n'importe quel élément ` +
        `(${collection.modes.filter(m => m !== base).map(m => `\`data-mode="${slug(m)}"\``).join(', ')}) et ne redéfinissent que les variables qui diffèrent.`,
        '',
      );
    }
    lines.push(`| Variable | CSS | ${collection.modes.map(cell).join(' | ')} |`, `|---|---|${collection.modes.map(() => '---').join('|')}|`);
    for (const variable of collection.variables) {
      const css = names.get(aliasKey(collection.name, variable.name)) ?? '';
      lines.push(`| ${cell(variable.name)} | \`${css}\` | ${collection.modes.map(m => displayValue(variable.values[m])).join(' | ')} |`);
    }
    lines.push('');
  }

  if (tokens.textStyles.length) {
    lines.push(`${heading}# Styles de texte`, '', '| Style | Classe | Police | Taille | Graisse | Interligne | Espacement |', '|---|---|---|---|---|---|---|');
    for (const s of bySizeDesc(tokens.textStyles)) {
      lines.push(`| ${cell(s.name)} | \`.text-${slug(s.name)}\` | ${(() => { const f = fontForStyle(tokens, s); return f ? `\`${fontCssName(f)}\` (${f.family})` : s.fontFamily; })()} | ${num(s.fontSize)} px | ${fontWeight(s.fontStyle)}${isItalic(s.fontStyle) ? ' italique' : ''} | ${lineHeightCss(s) ?? 'auto'} | ${letterSpacingCss(s) ?? '—'} |`);
    }
    lines.push('');
  }
  if (tokens.fonts?.length) {
    lines.push(`${heading}# Polices`, '', 'Déclarées une fois pour tout le projet : les styles de texte y renvoient (`var(--font-…)`), changer la famille ici les change tous.', '', '| Nom | CSS | Famille | Source |', '|---|---|---|---|');
    for (const f of tokens.fonts) {
      const source = f.sources.length
        ? f.sources.map(s => s.kind === 'google' ? 'Google Fonts (`@import` dans `tokens.css`)' : `fichier \`fonts/${s.filename}\` du projet SCOPE`).join(', ')
        : 'installée / à fournir';
      lines.push(`| ${cell(f.name)} | \`${fontCssName(f)}\` | ${cell(f.family)}, ${f.fallback ?? 'sans-serif'} | ${source} |`);
    }
    lines.push('');
  }
  if (tokens.colorStyles.length) {
    lines.push(`${heading}# Styles de couleur`, '', '| Style | CSS | Valeur |', '|---|---|---|');
    for (const s of tokens.colorStyles) {
      const value = paintCss(s.paints);
      if (value) lines.push(`| ${cell(s.name)} | \`--color-style-${slug(s.name)}\` | \`${value}\` |`);
    }
    lines.push('');
  }
  if (tokens.effectStyles.length) {
    lines.push(`${heading}# Effets`, '', '| Style | CSS | Valeur |', '|---|---|---|');
    for (const s of tokens.effectStyles) {
      const effect = effectCss(s);
      if (effect) lines.push(`| ${cell(s.name)} | \`${effect.property}\` | \`${effect.value}\` |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

/** D'où viennent les tokens : fichier synchronisé, saisie dans SCOPE, ou les deux. */
export function tokenSource(tokens: DesignTokens): string {
  const manual = [...tokens.collections.flatMap(c => [c, ...c.variables]), ...tokens.textStyles, ...tokens.colorStyles, ...tokens.effectStyles]
    .some(item => item.origin === 'manual');
  const synced = tokens.syncedAt ? `du fichier « ${tokens.fileName ?? ''} » (synchronisés le ${tokens.syncedAt.slice(0, 10)})` : '';
  if (synced && manual) return `${synced}, complétés dans SCOPE`;
  return synced || 'saisis dans SCOPE';
}

/** Tokens vides : point de départ quand on les crée directement dans SCOPE, sans source de design. */
export const emptyTokens = (): DesignTokens => ({ collections: [], textStyles: [], colorStyles: [], effectStyles: [] });

/** Liste fusionnée : les éléments créés ou modifiés dans SCOPE (`manual`) l'emportent sur ceux de la source du même nom. */
function mergeNamed<T extends { name: string; origin?: 'manual' }>(existing: T[] = [], incoming: T[]): T[] {
  const manual = new Map(existing.filter(item => item.origin === 'manual').map(item => [item.name, item]));
  const merged = incoming.map(item => manual.get(item.name) ?? item);
  const incomingNames = new Set(incoming.map(item => item.name));
  return [...merged, ...[...manual.values()].filter(item => !incomingNames.has(item.name))];
}

/**
 * Applique un envoi du plugin aux tokens du projet : tout ce qui vient de la source est remplacé (un élément
 * supprimé dans Figma disparaît), tout ce qui a été créé ou modifié dans SCOPE est conservé.
 */
export function mergeSyncedTokens(existing: DesignTokens | undefined, incoming: DesignTokens): DesignTokens {
  const existingCollections = existing?.collections ?? [];
  const synced = incoming.collections.map(collection => {
    const same = existingCollections.find(c => c.name === collection.name);
    // Modes ajoutés dans SCOPE (thèmes…) : conservés, avec leurs valeurs, même sur les variables que la source remplace.
    const manualModes = (same?.manualModes ?? []).filter(m => !collection.modes.includes(m));
    const variables = mergeNamed(same?.variables, collection.variables).map(variable => {
      if (variable.origin === 'manual') return variable;
      const previous = same?.variables.find(v => v.name === variable.name);
      const carried = Object.fromEntries(manualModes.filter(m => previous?.values[m] !== undefined).map(m => [m, previous!.values[m]]));
      return Object.keys(carried).length ? { ...variable, values: { ...variable.values, ...carried } } : variable;
    });
    return { ...collection, modes: [...collection.modes, ...manualModes], manualModes: manualModes.length ? manualModes : undefined, variables };
  });
  const syncedNames = new Set(synced.map(c => c.name));
  const manualCollections = existingCollections.filter(c => c.origin === 'manual' && !syncedNames.has(c.name));
  return {
    ...incoming,
    collections: [...synced, ...manualCollections],
    // Un style revenu de la source garde la police déclarée qu'il utilisait (si elle existe encore).
    textStyles: mergeNamed(existing?.textStyles, incoming.textStyles.map(style => {
      const ref = existing?.textStyles.find(s => s.name === style.name)?.fontRef;
      return ref && existing?.fonts?.some(f => f.id === ref) ? { ...style, fontRef: ref } : style;
    })),
    colorStyles: mergeNamed(existing?.colorStyles, incoming.colorStyles),
    effectStyles: mergeNamed(existing?.effectStyles, incoming.effectStyles),
    fonts: existing?.fonts?.length ? existing.fonts : incoming.fonts,
  };
}

/** Payload du plugin → tokens du projet (les champs manquants deviennent des listes vides). */
export function tokensFromPayload(payload: Partial<DesignTokens> & Record<string, unknown>, now = new Date().toISOString()): DesignTokens {
  return {
    fileKey: typeof payload.fileKey === 'string' ? payload.fileKey : undefined,
    fileName: typeof payload.fileName === 'string' ? payload.fileName : undefined,
    syncedAt: now,
    collections: Array.isArray(payload.collections) ? payload.collections : [],
    textStyles: Array.isArray(payload.textStyles) ? payload.textStyles : [],
    colorStyles: Array.isArray(payload.colorStyles) ? payload.colorStyles : [],
    effectStyles: Array.isArray(payload.effectStyles) ? payload.effectStyles : [],
  };
}

// ─── Édition des collections de variables ─────────────────────────────────────

/** Ce mode a-t-il été créé dans SCOPE (donc modifiable) ? Ceux d'une source (Figma) restent en lecture seule. */
export const isManualMode = (collection: TokenCollection, mode: string): boolean =>
  collection.origin === 'manual' || (collection.manualModes ?? []).includes(mode);

/** Ajoute un mode : il part des valeurs du mode par défaut, pour n'avoir qu'à changer ce qui diffère. */
export function addMode(collection: TokenCollection, mode: string): TokenCollection {
  const name = mode.trim();
  if (!name || collection.modes.includes(name)) return collection;
  const base = collection.defaultMode || collection.modes[0];
  return {
    ...collection,
    modes: [...collection.modes, name],
    manualModes: collection.origin === 'manual' ? collection.manualModes : [...(collection.manualModes ?? []), name],
    variables: collection.variables.map(v => (v.values[base] === undefined ? v : { ...v, values: { ...v.values, [name]: v.values[base] } })),
  };
}

/** Renomme un mode créé dans SCOPE (valeurs, mode par défaut et liste des modes suivent). */
export function renameMode(collection: TokenCollection, from: string, to: string): TokenCollection {
  const name = to.trim();
  if (!name || name === from || collection.modes.includes(name) || !isManualMode(collection, from)) return collection;
  const swap = (m: string) => (m === from ? name : m);
  return {
    ...collection,
    modes: collection.modes.map(swap),
    manualModes: collection.manualModes?.map(swap),
    defaultMode: swap(collection.defaultMode),
    variables: collection.variables.map(v => {
      if (!(from in v.values)) return v;
      const { [from]: value, ...rest } = v.values;
      return { ...v, values: { ...rest, [name]: value } };
    }),
  };
}

/** Supprime un mode créé dans SCOPE (jamais le dernier) ; le mode par défaut passe au premier restant. */
export function removeMode(collection: TokenCollection, mode: string): TokenCollection {
  if (!isManualMode(collection, mode) || collection.modes.length <= 1) return collection;
  const modes = collection.modes.filter(m => m !== mode);
  const manualModes = collection.manualModes?.filter(m => m !== mode);
  return {
    ...collection,
    modes,
    manualModes: manualModes?.length ? manualModes : undefined,
    defaultMode: collection.defaultMode === mode ? modes[0] : collection.defaultMode,
    variables: collection.variables.map(v => {
      const { [mode]: _removed, ...values } = v.values;
      void _removed;
      return { ...v, values };
    }),
  };
}

/** Renomme une collection ou une variable en mettant à jour les alias qui y renvoient. */
export function renameInTokens(
  tokens: DesignTokens,
  collectionName: string,
  from: { variable?: string },
  to: { collection?: string; variable?: string },
): DesignTokens {
  return {
    ...tokens,
    collections: tokens.collections.map(collection => {
      const renamedCollection = collection.name === collectionName && to.collection ? to.collection : collection.name;
      return {
        ...collection,
        name: renamedCollection,
        variables: collection.variables.map(variable => {
          const name = collection.name === collectionName && from.variable === variable.name && to.variable ? to.variable : variable.name;
          const values = Object.fromEntries(Object.entries(variable.values).map(([mode, value]) => {
            if (typeof value !== 'object' || value.collection !== collectionName) return [mode, value];
            if (from.variable !== undefined && value.alias !== from.variable) return [mode, value];
            return [mode, { alias: to.variable ?? value.alias, collection: to.collection ?? value.collection }];
          }));
          return { ...variable, name, values };
        }),
      };
    }),
  };
}

/** Variables du même type qu'une variable donnée, vers lesquelles elle peut renvoyer (alias), sauf elle-même. */
export function aliasTargets(tokens: DesignTokens, collectionName: string, variable: TokenVariable): { collection: string; name: string }[] {
  return tokens.collections.flatMap(c =>
    c.variables
      .filter(v => v.type === variable.type && !(c.name === collectionName && v.name === variable.name))
      .map(v => ({ collection: c.name, name: v.name })),
  );
}

