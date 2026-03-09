'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

export type TextBlockVariant = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'list-item';

const VARIANT_STYLES: Record<TextBlockVariant, string> = {
  paragraph: 'text-base leading-relaxed',
  heading1: 'text-2xl font-bold leading-tight',
  heading2: 'text-xl font-semibold leading-tight',
  heading3: 'text-lg font-medium leading-snug',
  'list-item': 'text-base leading-relaxed',
};

const VARIANT_PLACEHOLDERS: Record<TextBlockVariant, string> = {
  paragraph: 'Tapez du texte ou / pour les commandes...',
  heading1: 'Titre 1',
  heading2: 'Titre 2',
  heading3: 'Titre 3',
  'list-item': 'Élément de liste',
};

interface TextBlockProps {
  content: string;
  variant?: TextBlockVariant;
  onSave: (content: string) => void;
  autoFocus?: boolean;
  onSlashCommand?: (caretRect: DOMRect, textBefore: string, textAfter: string) => void;
  onDelete?: () => void;
  onSplit?: (textBefore: string, textAfter: string) => void;
}

export default function TextBlock({
  content,
  variant = 'paragraph',
  onSave,
  autoFocus,
  onSlashCommand,
  onDelete,
  onSplit,
}: TextBlockProps) {
  const [localValue, setLocalValue] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const displayValue = localValue ?? content;

  const resize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, []);

  useEffect(() => { resize(); }, [displayValue, resize]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  function handleFocus() {
    setLocalValue(content);
  }

  function handleBlur() {
    if (localValue !== null && localValue !== content) {
      onSave(localValue);
    }
    setLocalValue(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    setLocalValue(newValue);

    const ta = textareaRef.current;
    if (!ta || !onSlashCommand) return;
    const cursorPos = ta.selectionStart;
    if (cursorPos > 0 && newValue[cursorPos - 1] === '/') {
      const rect = getCaretRect(ta, cursorPos - 1);
      if (rect) {
        onSlashCommand(rect, newValue.slice(0, cursorPos - 1), newValue.slice(cursorPos));
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
    if (e.key === 'Backspace' && displayValue === '' && onDelete) {
      e.preventDefault();
      onDelete();
    }
  }

  return (
    <div className={variant === 'list-item' ? 'flex items-start gap-2' : undefined}>
      {variant === 'list-item' && (
        <span className="text-muted-foreground select-none mt-[3px]">•</span>
      )}
      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={VARIANT_PLACEHOLDERS[variant]}
        className={cn(
          'w-full resize-none bg-transparent outline-none border-0 border-l-2 border-transparent focus:border-border px-3 py-1 transition-colors placeholder:text-muted-foreground/50',
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
