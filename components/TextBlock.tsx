'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { WidgetType } from '@/lib/types';

export type TextBlockVariant = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'list-item';

const VARIANT_STYLES: Record<TextBlockVariant, string> = {
  paragraph: 'text-base leading-normal',
  heading1: 'text-2xl font-bold leading-tight',
  heading2: 'text-xl font-semibold leading-tight',
  heading3: 'text-lg font-medium leading-snug',
  'list-item': 'text-base leading-normal',
};

const VARIANT_PLACEHOLDERS: Record<TextBlockVariant, string> = {
  paragraph: 'Tapez du texte ou / pour les commandes...',
  heading1: 'Titre 1',
  heading2: 'Titre 2',
  heading3: 'Titre 3',
  'list-item': 'Élément de liste',
};

/** Comportements « éditeur de blocs » d'un bloc de texte, fournis par la page qui le contient. */
export interface TextBlockHandlers {
  autoFocus?: boolean;
  /** Change à chaque demande de focus : redonne le focus même si `autoFocus` est déjà vrai. */
  focusToken?: number;
  /** Position du curseur à la prise de focus (sinon fin du texte). */
  focusCaret?: number;
  onSlashCommand?: (caretRect: DOMRect, textBefore: string, textAfter: string) => void;
  /** Texte tapé après le « / » : filtre le menu des blocs. */
  onSlashFilter?: (filter: string) => void;
  onSlashClose?: () => void;
  onDelete?: () => void;
  onSplit?: (textBefore: string, textAfter: string) => void;
  /** Raccourci Markdown en début de bloc (« # », « - »…) : transforme le bloc, `rest` = texte restant. */
  onShortcut?: (type: WidgetType, rest: string) => void;
  /** Retour arrière au début d'un bloc non vide : fusion avec le bloc précédent. */
  onMergeBack?: (value: string) => void;
  /** Retour arrière au début d'un titre ou d'une puce : redevient un paragraphe. */
  onConvertToParagraph?: () => void;
}

interface TextBlockProps extends TextBlockHandlers {
  content: string;
  variant?: TextBlockVariant;
  onSave: (content: string) => void;
}

const SHORTCUTS: Record<string, WidgetType> = { '#': 'heading1', '##': 'heading2', '###': 'heading3', '-': 'bullet', '*': 'bullet' };

/** Zone de texte voisine (bloc précédent/suivant de la page), pour circuler au clavier. */
function neighbourInput(current: HTMLTextAreaElement, direction: -1 | 1): HTMLTextAreaElement | undefined {
  const all = Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea[data-block-input]'));
  return all[all.indexOf(current) + direction];
}

export default function TextBlock({
  content,
  variant = 'paragraph',
  onSave,
  autoFocus,
  focusToken,
  focusCaret,
  onSlashCommand,
  onSlashFilter,
  onSlashClose,
  onDelete,
  onSplit,
  onShortcut,
  onMergeBack,
  onConvertToParagraph,
}: TextBlockProps) {
  const [localValue, setLocalValue] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Position du « / » qui a ouvert le menu des blocs (null = menu fermé).
  const slashStart = useRef<number | null>(null);
  // Vrai tant que la saisie n'a pas été enregistrée : un changement venu de l'extérieur (découpe, fusion) l'annule,
  // sinon la perte de focus qui suit réécrirait l'ancien texte par-dessus.
  const dirty = useRef(false);

  // Le contenu ne change que de l'extérieur (fusion, découpe, transformation) : la saisie en cours repart de lui.
  useEffect(() => { dirty.current = false; setLocalValue(null); }, [content]);

  const displayValue = localValue ?? content;

  const resize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, []);

  useEffect(() => { resize(); }, [displayValue, resize]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!autoFocus || !ta) return;
    ta.focus();
    // Après le rendu : le contenu fusionné ou transformé est alors en place.
    requestAnimationFrame(() => {
      const caret = Math.min(focusCaret ?? ta.value.length, ta.value.length);
      ta.setSelectionRange(caret, caret);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, focusToken]);

  function handleFocus() {
    setLocalValue(content);
  }

  function handleBlur() {
    slashStart.current = null;
    if (dirty.current && localValue !== null && localValue !== content) {
      onSave(localValue);
    }
    dirty.current = false;
    setLocalValue(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    dirty.current = true;
    setLocalValue(newValue);

    const ta = textareaRef.current;
    if (!ta) return;
    const cursorPos = ta.selectionStart;

    // Raccourcis Markdown en début de bloc : « # » titre 1, « ## » titre 2, « ### » titre 3, « - » puce.
    const shortcut = onShortcut && newValue.slice(0, cursorPos).match(/^(#{1,3}|-|\*) $/);
    if (shortcut && cursorPos === shortcut[0].length) {
      slashStart.current = null;
      onShortcut!(SHORTCUTS[shortcut[1]], newValue.slice(cursorPos));
      return;
    }

    // Menu des blocs : s'ouvre sur un « / » en début de bloc ou après un espace, se filtre en tapant.
    const typedSlash = newValue[cursorPos - 1] === '/' && (cursorPos === 1 || /\s/.test(newValue[cursorPos - 2]));
    if (onSlashCommand && typedSlash) {
      const rect = getCaretRect(ta, cursorPos - 1);
      if (rect) {
        slashStart.current = cursorPos - 1;
        onSlashCommand(rect, newValue.slice(0, cursorPos - 1), newValue.slice(cursorPos));
      }
    } else if (slashStart.current !== null) {
      const start = slashStart.current;
      const typed = newValue.slice(start + 1, cursorPos);
      if (cursorPos <= start || newValue[start] !== '/' || /\s/.test(typed)) {
        slashStart.current = null;
        onSlashClose?.();
      } else {
        onSlashFilter?.(typed);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && onSplit) {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const pos = ta.selectionStart;
      const value = localValue ?? content;
      onSplit(value.slice(0, pos), value.slice(pos));
      return;
    }
    const ta = textareaRef.current;
    if (!ta) return;
    const atStart = ta.selectionStart === 0 && ta.selectionEnd === 0;
    const atEnd = ta.selectionStart === displayValue.length && ta.selectionEnd === displayValue.length;

    if (e.key === 'Backspace' && atStart) {
      if (displayValue === '' && onDelete) {
        e.preventDefault();
        onDelete();
      } else if (onConvertToParagraph) {
        e.preventDefault();
        onConvertToParagraph();
      } else if (onMergeBack) {
        e.preventDefault();
        onMergeBack(displayValue);
      }
      return;
    }

    // Flèches : au bord du texte, on passe au bloc voisin (curseur à la fin en montant, au début en descendant).
    const direction = e.key === 'ArrowUp' && atStart ? -1 : e.key === 'ArrowDown' && atEnd ? 1 : 0;
    if (direction !== 0 && !e.shiftKey) {
      const target = neighbourInput(ta, direction);
      if (target) {
        e.preventDefault();
        target.focus();
        const caret = direction < 0 ? target.value.length : 0;
        target.setSelectionRange(caret, caret);
      }
    }
  }

  return (
    <div className={variant === 'list-item' ? 'flex items-start gap-2' : undefined}>
      {variant === 'list-item' && (
        <span className="text-muted-foreground select-none mt-[3px]">•</span>
      )}
      <textarea
        ref={textareaRef}
        data-block-input
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={VARIANT_PLACEHOLDERS[variant]}
        className={cn(
          'w-full resize-none bg-transparent outline-none border-0 border-l-2 border-transparent focus:border-border px-3 py-0.5 transition-colors placeholder:text-muted-foreground/50',
          VARIANT_STYLES[variant],
        )}
        rows={1}
      />
    </div>
  );
}

function getCaretRect(textarea: HTMLTextAreaElement, position: number): DOMRect | null {
  const mirror = document.createElement('div');
  const style = window.getComputedStyle(textarea);

  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.overflow = 'hidden';
  mirror.style.width = style.width;
  mirror.style.font = style.font;
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.lineHeight = style.lineHeight;

  const textBefore = textarea.value.substring(0, position);
  mirror.appendChild(document.createTextNode(textBefore));

  const span = document.createElement('span');
  span.textContent = '/';
  mirror.appendChild(span);

  document.body.appendChild(mirror);

  const taRect = textarea.getBoundingClientRect();
  const spanRect = span.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();

  const rect = new DOMRect(
    taRect.left + (spanRect.left - mirrorRect.left),
    taRect.top + (spanRect.top - mirrorRect.top) - textarea.scrollTop,
    spanRect.width,
    spanRect.height
  );

  document.body.removeChild(mirror);
  return rect;
}
