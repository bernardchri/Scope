'use client';

import { useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import {
  DesignTokens, EffectStyleToken, FontSource, FontToken, TextStyleToken, TokenCollection, TokenValue, TokenVariable,
} from '@/lib/types';
import {
  WEIGHT_NAMES, emptyTokens, fontStyleName, fontWeight, isItalic, textStyleDeclarations, tokenSource, tokensToCss, tokensToJson,
  variableCssNames,
} from '@/lib/designTokens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { describeFontFile, effectiveFamily, fontCssName, fontCssValue, fontForStyle, isFontAvailable, nextFontName, parseGoogleFontsUrl } from '@/lib/fonts';
import { usePreviewFonts } from '@/lib/hooks/usePreviewFonts';

interface TokensPageProps {
  /** Tokens du projet ; `undefined` tant que rien n'a été créé ni synchronisé. */
  tokens?: DesignTokens;
  onChange: (tokens: DesignTokens) => void;
  /** Dossier du projet : reçoit les fichiers de police (`fonts/`). */
  folderPath?: string;
  className?: string;
}

/** Faux texte d'aperçu : court pour un titre, plus long pour un texte courant (on juge l'interligne sur plusieurs lignes). */
const sampleText = (fontSize: number) =>
  fontSize >= 28
    ? 'Lorem ipsum dolor sit amet'
    : 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;
const SELECT = 'h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground';
const TYPE_LABELS: Record<string, string> = { COLOR: 'Couleur', FLOAT: 'Nombre', STRING: 'Texte', BOOLEAN: 'Oui / non' };
const DEFAULT_VALUES: Record<string, TokenValue> = { COLOR: '#000000', FLOAT: 0, STRING: '', BOOLEAN: false };

const Section = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

/** Mention discrète d'un élément créé ou modifié dans SCOPE : il est protégé des synchronisations. */
const ManualBadge = ({ show }: { show?: boolean }) =>
  show ? <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground" title="Créé ou modifié dans SCOPE : une synchronisation ne l'écrase pas">SCOPE</span> : null;

/** Couleur : sélecteur natif + saisie hexadécimale. */
function ColorInput({ value, onCommit }: { value: string; onCommit: (hex: string) => void }) {
  return (
    <span className="inline-flex items-center gap-2">
      <input
        type="color"
        className="h-7 w-7 cursor-pointer rounded border bg-transparent p-0"
        value={HEX.test(value) ? value.slice(0, 7) : '#000000'}
        onChange={(e) => onCommit(e.target.value)}
      />
      <Input
        key={value}
        className="h-8 w-28 font-mono text-xs"
        defaultValue={value}
        onBlur={(e) => HEX.test(e.target.value.trim()) && e.target.value.trim() !== value && onCommit(e.target.value.trim())}
      />
    </span>
  );
}

function VariableValue({ variable, value, onCommit }: { variable: TokenVariable; value: TokenValue | undefined; onCommit: (v: TokenValue) => void }) {
  if (value !== undefined && typeof value === 'object') return <span className="text-muted-foreground">→ {value.alias}</span>;
  if (variable.type === 'COLOR') return <ColorInput value={typeof value === 'string' ? value : '#000000'} onCommit={onCommit} />;
  if (variable.type === 'BOOLEAN') return <Checkbox checked={value === true} onCheckedChange={(v) => onCommit(v === true)} />;
  const numeric = variable.type === 'FLOAT';
  return (
    <Input
      key={String(value)}
      className="h-8 w-32 text-xs"
      type={numeric ? 'number' : 'text'}
      defaultValue={value === undefined ? '' : String(value)}
      onBlur={(e) => {
        const next = numeric ? Number(e.target.value) : e.target.value;
        if (next !== value && !(numeric && Number.isNaN(next))) onCommit(next);
      }}
    />
  );
}

/** Variables, styles de texte, de couleur et d'effet du projet : reçus d'une source (plugin) ou saisis ici. */
export default function TokensPage({ tokens, onChange, folderPath, className }: TokensPageProps) {
  const t = tokens ?? emptyTokens();
  // Charge les polices du projet ; le compteur relance la détection quand l'une d'elles arrive.
  const fontTick = usePreviewFonts(folderPath, t.fonts);
  const [fontError, setFontError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [newCollection, setNewCollection] = useState({ name: '', modes: 'Mode 1' });
  const [newVariable, setNewVariable] = useState<Record<string, { name: string; type: string }>>({});
  const [newMode, setNewMode] = useState<Record<string, string>>({});
  const names = variableCssNames(t.collections);
  const isEmpty = !t.collections.length && !t.textStyles.length && !t.colorStyles.length && !t.effectStyles.length;

  const update = (patch: Partial<DesignTokens>) => onChange({ ...t, ...patch });

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  // ── Variables ──────────────────────────────────────────────────────────────
  const setCollection = (ci: number, collection: TokenCollection) =>
    update({ collections: t.collections.map((c, i) => (i === ci ? collection : c)) });

  function setVariable(ci: number, vi: number, variable: TokenVariable) {
    const collection = t.collections[ci];
    setCollection(ci, { ...collection, variables: collection.variables.map((v, i) => (i === vi ? { ...variable, origin: 'manual' } : v)) });
  }

  function addCollection() {
    const name = newCollection.name.trim();
    if (!name || t.collections.some(c => c.name === name)) return;
    const modes = newCollection.modes.split(',').map(m => m.trim()).filter(Boolean);
    update({ collections: [...t.collections, { origin: 'manual', name, modes: modes.length ? modes : ['Mode 1'], defaultMode: modes[0] ?? 'Mode 1', variables: [] }] });
    setNewCollection({ name: '', modes: 'Mode 1' });
  }

  function addVariable(ci: number) {
    const draft = newVariable[ci] ?? { name: '', type: 'COLOR' };
    const name = draft.name.trim();
    const collection = t.collections[ci];
    if (!name || collection.variables.some(v => v.name === name)) return;
    const values = Object.fromEntries(collection.modes.map(m => [m, DEFAULT_VALUES[draft.type]]));
    setCollection(ci, { ...collection, variables: [...collection.variables, { origin: 'manual', name, type: draft.type, values }] });
    setNewVariable({ ...newVariable, [ci]: { name: '', type: draft.type } });
  }

  function addMode(ci: number) {
    const mode = (newMode[ci] ?? '').trim();
    const collection = t.collections[ci];
    if (!mode || collection.modes.includes(mode)) return;
    const base = collection.defaultMode || collection.modes[0];
    setCollection(ci, {
      ...collection,
      modes: [...collection.modes, mode],
      variables: collection.variables.map(v => (v.values[base] === undefined ? v : { ...v, values: { ...v.values, [mode]: v.values[base] } })),
    });
    setNewMode({ ...newMode, [ci]: '' });
  }

  // ── Styles de texte ────────────────────────────────────────────────────────
  const setText = (i: number, patch: Partial<TextStyleToken>) =>
    update({ textStyles: t.textStyles.map((s, k) => (k === i ? { ...s, ...patch, origin: 'manual' } : s)) });

  function addTextStyle() {
    let name = 'Nouveau style';
    for (let n = 2; t.textStyles.some(s => s.name === name); n++) name = `Nouveau style ${n}`;
    update({
      textStyles: [...t.textStyles, {
        origin: 'manual', name, fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 16,
        lineHeight: { unit: 'PERCENT', value: 150 }, letterSpacing: { unit: 'PIXELS', value: 0 },
      }],
    });
  }

  // ── Polices déclarées ──────────────────────────────────────────────────────
  const fonts = t.fonts ?? [];
  const setFont = (id: string, patch: Partial<FontToken>) =>
    update({ fonts: fonts.map(f => (f.id === id ? { ...f, ...patch } : f)) });

  function addFont() {
    update({ fonts: [...fonts, { id: crypto.randomUUID(), name: nextFontName(fonts), family: 'Inter', sources: [] }] });
  }

  function removeFont(font: FontToken) {
    // Les styles qui l'utilisaient gardent sa famille en saisie libre.
    update({
      fonts: fonts.filter(f => f.id !== font.id),
      textStyles: t.textStyles.map(s => (s.fontRef === font.id ? { ...s, fontRef: undefined, fontFamily: font.family } : s)),
    });
  }

  const addSource = (font: FontToken, source: FontSource) => setFont(font.id, { sources: [...font.sources, source] });
  const removeSource = (font: FontToken, index: number) => setFont(font.id, { sources: font.sources.filter((_, i) => i !== index) });

  /** URL collée (adresse, `<link>` ou `@import` de Google Fonts) : enregistrée comme source de la police. */
  function addGoogleFromUrl(font: FontToken, pasted: string) {
    const parsed = parseGoogleFontsUrl(pasted);
    if (!parsed) { setFontError('Aucune adresse Google Fonts reconnue (https://fonts.googleapis.com/css2?family=…).'); return; }
    setFontError(null);
    setFont(font.id, {
      family: parsed.family ?? font.family,
      sources: [...font.sources.filter(s => s.kind !== 'google'), { kind: 'google', url: parsed.url }],
    });
  }

  /** Copie des fichiers choisis dans `fonts/` du projet et ajout comme sources de la police. */
  async function addFontFiles(font: FontToken) {
    if (!folderPath) { setFontError('Ouvre un projet pour y ajouter une police.'); return; }
    setFontError(null);
    const picked = await open({ multiple: true, filters: [{ name: 'Police', extensions: ['ttf', 'otf', 'woff', 'woff2'] }] });
    const paths = Array.isArray(picked) ? picked : picked ? [picked] : [];
    const added: FontSource[] = [];
    try {
      for (const path of paths) {
        const filename = path.split('/').pop()!;
        if (font.sources.some(s => s.kind === 'file' && s.filename === filename)) continue;
        const data = await invoke<string>('read_image_as_base64', { filePath: path });
        await invoke('write_binary_file', { path: `${folderPath}/fonts/${filename}`, base64Data: data });
        added.push({ kind: 'file', filename, ...describeFontFile(filename) });
      }
    } catch (e) {
      setFontError(`Police non ajoutée : ${e instanceof Error ? e.message : e}`);
    }
    if (added.length) setFont(font.id, { sources: [...font.sources, ...added] });
  }

  // ── Styles de couleur et d'effet ───────────────────────────────────────────
  function addColorStyle() {
    let name = 'Nouvelle couleur';
    for (let n = 2; t.colorStyles.some(s => s.name === name); n++) name = `Nouvelle couleur ${n}`;
    update({ colorStyles: [...t.colorStyles, { origin: 'manual', name, paints: [{ type: 'SOLID', color: '#000000' }] }] });
  }

  function addShadow() {
    let name = 'Nouvelle ombre';
    for (let n = 2; t.effectStyles.some(s => s.name === name); n++) name = `Nouvelle ombre ${n}`;
    update({ effectStyles: [...t.effectStyles, { origin: 'manual', name, effects: [{ type: 'DROP_SHADOW', color: '#00000040', x: 0, y: 4, blur: 12, spread: 0 }] }] });
  }

  const setEffect = (i: number, patch: Partial<EffectStyleToken>) =>
    update({ effectStyles: t.effectStyles.map((s, k) => (k === i ? { ...s, ...patch, origin: 'manual' } : s)) });

  const sourceLine = isEmpty ? 'Rien pour l\'instant : crée tes variables et styles ici, ou envoie-les depuis le plugin d\'un outil de design.' : `Tokens ${tokenSource(t)}.`;

  return (
    <div className={`overflow-y-auto p-8 ${className ?? ''}`}>
      <div className="max-w-5xl space-y-14">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">Design tokens</h1>
            <p className="text-sm text-muted-foreground">
              {sourceLine} Ce qui est créé ou modifié ici n&apos;est pas écrasé par une synchronisation.
            </p>
          </div>
          {!isEmpty && (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => copy('css', tokensToCss(t))}>
                <Copy className="h-4 w-4" /> {copied === 'css' ? 'Copié ✓' : 'Copier le CSS'}
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => copy('json', JSON.stringify(tokensToJson(t), null, 2))}>
                <Copy className="h-4 w-4" /> {copied === 'json' ? 'Copié ✓' : 'Copier le JSON'}
              </Button>
            </>
          )}
        </div>

        {/* ── Variables ─────────────────────────────────────────────────── */}
        {t.collections.map((collection, ci) => (
          <Section
            key={collection.name}
            title={`Variables — ${collection.name}${collection.modes.length > 1 ? ` (${collection.modes.join(' / ')})` : ''}`}
            action={collection.origin === 'manual' && (
              <Button
                variant="ghost" size="sm" className="h-7 gap-1 text-destructive hover:text-destructive"
                onClick={() => update({ collections: t.collections.filter((_, i) => i !== ci) })}
              >
                <Trash2 className="h-3.5 w-3.5" /> Supprimer la collection
              </Button>
            )}
          >
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Variable</th>
                    <th className="px-3 py-2 font-medium">CSS</th>
                    {collection.modes.map(mode => <th key={mode} className="px-3 py-2 font-medium">{mode}</th>)}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {collection.variables.map((variable, vi) => (
                    <tr key={variable.name}>
                      <td className="px-3 py-1.5 whitespace-nowrap" title={variable.description}>
                        {variable.name}<ManualBadge show={variable.origin === 'manual'} />
                      </td>
                      <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{names.get(`${collection.name}/${variable.name}`)}</td>
                      {collection.modes.map(mode => (
                        <td key={mode} className="px-3 py-1.5">
                          <VariableValue
                            variable={variable}
                            value={variable.values[mode]}
                            onCommit={(value) => setVariable(ci, vi, { ...variable, values: { ...variable.values, [mode]: value } })}
                          />
                        </td>
                      ))}
                      <td className="px-1">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7" title="Supprimer la variable (une variable de la source revient à la prochaine synchronisation)"
                          onClick={() => setCollection(ci, { ...collection, variables: collection.variables.filter((_, i) => i !== vi) })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="h-8 w-56 text-sm" placeholder="Nouvelle variable (ex. color/primary)"
                value={newVariable[ci]?.name ?? ''}
                onChange={(e) => setNewVariable({ ...newVariable, [ci]: { name: e.target.value, type: newVariable[ci]?.type ?? 'COLOR' } })}
                onKeyDown={(e) => e.key === 'Enter' && addVariable(ci)}
              />
              <select
                className={SELECT} value={newVariable[ci]?.type ?? 'COLOR'}
                onChange={(e) => setNewVariable({ ...newVariable, [ci]: { name: newVariable[ci]?.name ?? '', type: e.target.value } })}
              >
                {Object.entries(TYPE_LABELS).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
              </select>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => addVariable(ci)}><Plus className="h-4 w-4" /> Variable</Button>
              {collection.origin === 'manual' && (
                <>
                  <Input
                    className="h-8 w-36 text-sm" placeholder="Nouveau mode"
                    value={newMode[ci] ?? ''} onChange={(e) => setNewMode({ ...newMode, [ci]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && addMode(ci)}
                  />
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => addMode(ci)}><Plus className="h-4 w-4" /> Mode</Button>
                </>
              )}
            </div>
          </Section>
        ))}

        <Section title="Nouvelle collection de variables">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-8 w-56 text-sm" placeholder="Nom (ex. Couleurs, Espacements)"
              value={newCollection.name} onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addCollection()}
            />
            <Input
              className="h-8 w-56 text-sm" placeholder="Modes, séparés par une virgule"
              value={newCollection.modes} onChange={(e) => setNewCollection({ ...newCollection, modes: e.target.value })}
            />
            <Button size="sm" variant="outline" className="gap-1" onClick={addCollection}><Plus className="h-4 w-4" /> Collection</Button>
          </div>
        </Section>

        {/* ── Polices déclarées ─────────────────────────────────────────── */}
        <Section
          title="Polices"
          action={<Button size="sm" variant="outline" className="h-7 gap-1" onClick={addFont}><Plus className="h-3.5 w-3.5" /> Police</Button>}
        >
          <p className="text-xs text-muted-foreground">
            Déclare chaque police une fois (font-type-1, font-type-2…) : les styles de texte y renvoient. Changer la famille ici change tous les styles qui l&apos;utilisent.
          </p>
          {fontError && <p className="text-xs text-destructive">{fontError}</p>}
          <div className="space-y-5">
            {fonts.length === 0 && <p className="text-sm text-muted-foreground">Aucune police déclarée.</p>}
            {fonts.map(font => {
              // fontTick : se réévalue quand une police du projet vient d'être chargée
              const available = fontTick >= 0 && isFontAvailable(font.family);
              const usedBy = t.textStyles.filter(s => fontForStyle(t, s)?.id === font.id).length;
              return (
                <div key={font.id} className="border rounded-lg p-4 space-y-3">
                  <div className="pb-3 border-b break-words text-3xl" style={{ fontFamily: fontCssValue(font) }}>Aa — Lorem ipsum dolor sit amet</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      key={`name-${font.id}-${font.name}`} className="h-8 w-36 text-sm font-medium" defaultValue={font.name} title="Nom du rôle (devient la variable CSS)"
                      onBlur={(e) => e.target.value.trim() && !fonts.some(f => f.id !== font.id && f.name === e.target.value.trim()) && setFont(font.id, { name: e.target.value.trim() })}
                    />
                    <code className="text-xs text-muted-foreground">{fontCssName(font)}</code>
                    <Input
                      key={`family-${font.id}-${font.family}`} className="h-8 w-48 text-sm" placeholder="Famille (ex. Playfair Display)" defaultValue={font.family}
                      onBlur={(e) => e.target.value.trim() && setFont(font.id, { family: e.target.value.trim() })}
                    />
                    <select className={SELECT} value={font.fallback ?? 'sans-serif'} title="Famille générique de repli" onChange={(e) => setFont(font.id, { fallback: e.target.value as FontToken['fallback'] })}>
                      <option value="sans-serif">sans-serif</option>
                      <option value="serif">serif</option>
                      <option value="monospace">monospace</option>
                    </select>
                    <span className="text-xs text-muted-foreground">{usedBy} style{usedBy > 1 ? 's' : ''}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" title="Supprimer la police" onClick={() => removeFont(font)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {available
                      ? <span className="text-muted-foreground">✓ Police disponible pour l&apos;aperçu</span>
                      : <span className="text-amber-600">⚠ Police absente : l&apos;aperçu utilise une police de remplacement</span>}
                    {!available && !font.sources.some(s => s.kind === 'google') && (
                      <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => addSource(font, { kind: 'google' })}>Charger depuis Google Fonts</Button>
                    )}
                    {!available && (
                      <Input
                        className="h-6 w-64 text-xs" placeholder="ou colle l'URL Google Fonts (Entrée)"
                        onKeyDown={(e) => { if (e.key === 'Enter') { addGoogleFromUrl(font, e.currentTarget.value); e.currentTarget.value = ''; } }}
                        onPaste={(e) => { const text = e.clipboardData.getData('text'); if (parseGoogleFontsUrl(text)) { e.preventDefault(); addGoogleFromUrl(font, text); } }}
                      />
                    )}
                    <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => addFontFiles(font)}>Ajouter un fichier de police…</Button>
                    {font.sources.map((source, index) => (
                      <span key={index} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                        {source.kind === 'google' ? 'Google Fonts' : source.filename}
                        <button className="hover:text-destructive" title="Retirer cette source" onClick={() => removeSource(font, index)}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Styles de texte ───────────────────────────────────────────── */}
        <Section
          title="Styles de texte"
          action={<Button size="sm" variant="outline" className="h-7 gap-1" onClick={addTextStyle}><Plus className="h-3.5 w-3.5" /> Style</Button>}
        >
          <div className="space-y-5">
            {t.textStyles.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">Aucun style de texte.</p>}
            {t.textStyles.map((style, i) => {
              const font = fontForStyle(t, style);
              const family = effectiveFamily(t, style);
              // fontTick : se réévalue quand une police du projet vient d'être chargée
              const available = fontTick >= 0 && isFontAvailable(family);
              const css = Object.fromEntries(
                textStyleDeclarations(style, font ? fontCssValue(font) : undefined).map(d => d.split(': ') as [string, string])
                  .map(([k, v]) => [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.replace(/"/g, '')]),
              );
              const weight = fontWeight(style.fontStyle);

              const lineUnit = style.lineHeight.unit;
              return (
                <div key={style.name} className="border rounded-lg p-4 space-y-3">
                  {/* Rendu en premier : c'est ce qu'on juge, les réglages viennent dessous */}
                  <div className="pb-3 border-b break-words" style={{ ...css, fontSize: Math.min(style.fontSize, 64) }}>
                    {sampleText(style.fontSize)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      key={`name-${style.name}`} className="h-8 w-44 text-sm font-medium" defaultValue={style.name}
                      onBlur={(e) => e.target.value.trim() && !t.textStyles.some((s, k) => k !== i && s.name === e.target.value.trim()) && setText(i, { name: e.target.value.trim() })}
                    />
                    <ManualBadge show={style.origin === 'manual'} />
                    <select
                      className={SELECT} title="Police du style"
                      value={style.fontRef && fonts.some(f => f.id === style.fontRef) ? style.fontRef : font ? font.id : '__free__'}
                      onChange={(e) => {
                        const chosen = fonts.find(f => f.id === e.target.value);
                        setText(i, chosen ? { fontRef: chosen.id, fontFamily: chosen.family } : { fontRef: undefined });
                      }}
                    >
                      {fonts.map(f => <option key={f.id} value={f.id}>{f.name} — {f.family}</option>)}
                      <option value="__free__">Autre police (saisie libre)</option>
                    </select>
                    {!font && (
                      <Input key={`family-${style.fontFamily}`} className="h-8 w-36 text-sm" placeholder="Famille" defaultValue={style.fontFamily} onBlur={(e) => setText(i, { fontFamily: e.target.value.trim() || 'Inter' })} />
                    )}
                    <select className={SELECT} value={weight} onChange={(e) => setText(i, { fontStyle: fontStyleName(Number(e.target.value), isItalic(style.fontStyle)) })}>
                      {WEIGHT_NAMES.map(([w, label]) => <option key={w} value={w}>{label} ({w})</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Checkbox checked={isItalic(style.fontStyle)} onCheckedChange={(v) => setText(i, { fontStyle: fontStyleName(weight, v === true) })} /> Italique
                    </label>
                    <Input
                      key={`size-${style.fontSize}`} className="h-8 w-20 text-sm" type="number" min={1} defaultValue={style.fontSize}
                      onBlur={(e) => Number(e.target.value) > 0 && setText(i, { fontSize: Number(e.target.value) })}
                    />
                    <span className="text-xs text-muted-foreground">px</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" title="Supprimer le style" onClick={() => update({ textStyles: t.textStyles.filter((_, k) => k !== i) })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    Interligne
                    <select
                      className={SELECT} value={lineUnit}
                      onChange={(e) => setText(i, { lineHeight: e.target.value === 'AUTO' ? { unit: 'AUTO' } : { unit: e.target.value as 'PIXELS' | 'PERCENT', value: e.target.value === 'PERCENT' ? 150 : Math.round(style.fontSize * 1.5) } })}
                    >
                      <option value="AUTO">auto</option>
                      <option value="PIXELS">px</option>
                      <option value="PERCENT">%</option>
                    </select>
                    {lineUnit !== 'AUTO' && (
                      <Input
                        key={`${lineUnit}-${style.lineHeight.value}`} className="h-8 w-20 text-sm" type="number" defaultValue={style.lineHeight.value}
                        onBlur={(e) => setText(i, { lineHeight: { unit: lineUnit, value: Number(e.target.value) } })}
                      />
                    )}
                    Espacement
                    <Input
                      key={`ls-${style.letterSpacing.value}-${style.letterSpacing.unit}`} className="h-8 w-20 text-sm" type="number" step="0.1" defaultValue={style.letterSpacing.value}
                      onBlur={(e) => setText(i, { letterSpacing: { ...style.letterSpacing, value: Number(e.target.value) || 0 } })}
                    />
                    <select className={SELECT} value={style.letterSpacing.unit} onChange={(e) => setText(i, { letterSpacing: { ...style.letterSpacing, unit: e.target.value as 'PIXELS' | 'PERCENT' } })}>
                      <option value="PIXELS">px</option>
                      <option value="PERCENT">%</option>
                    </select>
                    Casse
                    <select className={SELECT} value={style.textCase ?? 'ORIGINAL'} onChange={(e) => setText(i, { textCase: e.target.value })}>
                      <option value="ORIGINAL">normale</option>
                      <option value="UPPER">MAJUSCULES</option>
                      <option value="LOWER">minuscules</option>
                      <option value="TITLE">Capitales</option>
                    </select>
                  </div>
                  {!available && (
                    <p className="text-xs text-amber-600">⚠ Police « {family} » absente : l&apos;aperçu utilise une police de remplacement{font ? ' — ajoute une source dans la section Polices' : ' — déclare-la dans la section Polices'}.</p>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Styles de couleur ─────────────────────────────────────────── */}
        <Section
          title="Styles de couleur"
          action={<Button size="sm" variant="outline" className="h-7 gap-1" onClick={addColorStyle}><Plus className="h-3.5 w-3.5" /> Couleur</Button>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {t.colorStyles.length === 0 && <p className="text-sm text-muted-foreground">Aucun style de couleur.</p>}
            {t.colorStyles.map((style, i) => {
              const paint = style.paints[0];
              const solid = paint && 'color' in paint ? paint.color : undefined;
              const background = solid ?? (paint && 'stops' in paint ? `linear-gradient(to right, ${paint.stops.map(s => s.color).join(', ')})` : undefined);
              return (
                <div key={style.name} className="border rounded-lg overflow-hidden">
                  <div className="h-12" style={{ background }} />
                  <div className="p-2 space-y-1.5">
                    <div className="flex items-center gap-1">
                      <Input
                        key={`color-${style.name}`} className="h-8 text-sm" defaultValue={style.name}
                        onBlur={(e) => e.target.value.trim() && !t.colorStyles.some((s, k) => k !== i && s.name === e.target.value.trim()) &&
                          update({ colorStyles: t.colorStyles.map((s, k) => (k === i ? { ...s, name: e.target.value.trim(), origin: 'manual' } : s)) })}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Supprimer" onClick={() => update({ colorStyles: t.colorStyles.filter((_, k) => k !== i) })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {solid !== undefined
                      ? <ColorInput value={solid} onCommit={(hex) => update({ colorStyles: t.colorStyles.map((s, k) => (k === i ? { ...s, origin: 'manual', paints: [{ type: 'SOLID', color: hex }] } : s)) })} />
                      : <p className="text-xs text-muted-foreground">Dégradé (modifiable dans l&apos;outil de design)</p>}
                    <ManualBadge show={style.origin === 'manual'} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Effets ────────────────────────────────────────────────────── */}
        <Section
          title="Effets (ombres)"
          action={<Button size="sm" variant="outline" className="h-7 gap-1" onClick={addShadow}><Plus className="h-3.5 w-3.5" /> Ombre</Button>}
        >
          <div className="border rounded-lg divide-y">
            {t.effectStyles.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">Aucun effet.</p>}
            {t.effectStyles.map((style, i) => {
              const shadow = style.effects[0];
              const editable = shadow && 'color' in shadow ? shadow : undefined;
              const patchShadow = (patch: Record<string, number | string>) =>
                setEffect(i, { effects: [{ ...(editable as object), ...patch } as EffectStyleToken['effects'][number], ...style.effects.slice(1)] });
              return (
                <div key={style.name} className="px-4 py-3 flex flex-wrap items-center gap-2">
                  <Input
                    key={`effect-${style.name}`} className="h-8 w-44 text-sm font-medium" defaultValue={style.name}
                    onBlur={(e) => e.target.value.trim() && !t.effectStyles.some((s, k) => k !== i && s.name === e.target.value.trim()) && setEffect(i, { name: e.target.value.trim() })}
                  />
                  <ManualBadge show={style.origin === 'manual'} />
                  {editable ? (
                    <>
                      {(['x', 'y', 'blur', 'spread'] as const).map(key => (
                        <label key={key} className="flex items-center gap-1 text-xs text-muted-foreground">
                          {key === 'blur' ? 'flou' : key === 'spread' ? 'étendue' : key}
                          <Input
                            key={`${key}-${editable[key]}`} className="h-8 w-16 text-sm" type="number" defaultValue={editable[key]}
                            onBlur={(e) => patchShadow({ [key]: Number(e.target.value) || 0 })}
                          />
                        </label>
                      ))}
                      <ColorInput value={editable.color} onCommit={(hex) => patchShadow({ color: hex })} />
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Effet non modifiable ici</span>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" title="Supprimer" onClick={() => update({ effectStyles: t.effectStyles.filter((_, k) => k !== i) })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
}
