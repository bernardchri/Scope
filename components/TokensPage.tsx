'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { DesignTokens, TokenValue } from '@/lib/types';
import { textStyleDeclarations, tokensToCss, tokensToJson, variableCssNames } from '@/lib/designTokens';
import { Button } from '@/components/ui/button';

interface TokensPageProps {
  tokens: DesignTokens;
  className?: string;
}

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

function Swatch({ color }: { color: string }) {
  return <span className="inline-block h-4 w-4 rounded border align-middle mr-2" style={{ background: color }} />;
}

function valueText(value: TokenValue | undefined) {
  if (value === undefined) return <span className="text-muted-foreground">—</span>;
  if (typeof value === 'object') return <span className="text-muted-foreground">→ {value.alias}</span>;
  if (typeof value === 'string' && HEX.test(value)) return <span className="font-mono text-xs"><Swatch color={value} />{value}</span>;
  return <span className="font-mono text-xs">{String(value)}</span>;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</h3>
    {children}
  </section>
);

/** Variables et styles du document Figma, tels que le plugin les a envoyés (lecture seule : Figma est la source). */
export default function TokensPage({ tokens, className }: TokensPageProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const names = variableCssNames(tokens.collections);

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className={`overflow-y-auto p-8 ${className ?? ''}`}>
      <div className="max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">Design tokens</h1>
            <p className="text-sm text-muted-foreground">
              Figma « {tokens.fileName || '—'} » · synchronisés le {new Date(tokens.syncedAt).toLocaleString('fr-FR')} · à renvoyer depuis le plugin pour mettre à jour.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => copy('css', tokensToCss(tokens))}>
            <Copy className="h-4 w-4" /> {copied === 'css' ? 'Copié ✓' : 'Copier le CSS'}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => copy('json', JSON.stringify(tokensToJson(tokens), null, 2))}>
            <Copy className="h-4 w-4" /> {copied === 'json' ? 'Copié ✓' : 'Copier le JSON'}
          </Button>
        </div>

        {tokens.collections.filter(c => c.variables.length).map(collection => (
          <Section key={collection.name} title={`Variables — ${collection.name}${collection.modes.length > 1 ? ` (${collection.modes.join(' / ')})` : ''}`}>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Variable</th>
                    <th className="px-3 py-2 font-medium">CSS</th>
                    {collection.modes.map(mode => <th key={mode} className="px-3 py-2 font-medium">{mode}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {collection.variables.map(variable => (
                    <tr key={variable.name}>
                      <td className="px-3 py-1.5" title={variable.description}>{variable.name}</td>
                      <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{names.get(`${collection.name}/${variable.name}`)}</td>
                      {collection.modes.map(mode => <td key={mode} className="px-3 py-1.5">{valueText(variable.values[mode])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        ))}

        {tokens.textStyles.length > 0 && (
          <Section title="Styles de texte">
            <div className="border rounded-lg divide-y">
              {tokens.textStyles.map(style => {
                const css = Object.fromEntries(
                  textStyleDeclarations(style).map(d => d.split(': ') as [string, string]).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.replace(/^"|"(?=,)/g, '').replace(/"/g, '')]),
                );
                return (
                  <div key={style.name} className="px-4 py-3 flex items-baseline gap-4">
                    <div className="w-48 shrink-0">
                      <div className="text-sm font-medium">{style.name}</div>
                      <div className="text-xs text-muted-foreground">{style.fontFamily} · {style.fontStyle} · {style.fontSize}px</div>
                    </div>
                    <div className="min-w-0 truncate" style={{ ...css, fontSize: Math.min(style.fontSize, 40) }}>Aa — Les éditions de la Vilaine</div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {tokens.colorStyles.length > 0 && (
          <Section title="Styles de couleur">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {tokens.colorStyles.map(style => {
                const paint = style.paints[0];
                const background = paint && 'color' in paint
                  ? paint.color
                  : paint && 'stops' in paint ? `linear-gradient(to right, ${paint.stops.map(s => s.color).join(', ')})` : undefined;
                return (
                  <div key={style.name} className="border rounded-lg overflow-hidden">
                    <div className="h-12" style={{ background }} />
                    <div className="px-2 py-1.5 text-xs truncate" title={style.name}>{style.name}</div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {tokens.effectStyles.length > 0 && (
          <Section title="Effets">
            <ul className="text-sm space-y-1">
              {tokens.effectStyles.map(style => (
                <li key={style.name}>
                  <span className="font-medium">{style.name}</span>{' '}
                  <span className="text-muted-foreground font-mono text-xs">
                    {style.effects.map(e => ('color' in e ? `${e.type === 'INNER_SHADOW' ? 'inset ' : ''}${e.x} ${e.y} ${e.blur} ${e.spread} ${e.color}` : `flou ${'blur' in e ? e.blur : ''}px`)).join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}
