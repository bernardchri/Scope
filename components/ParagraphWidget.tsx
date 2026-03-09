'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ParagraphWidgetProps {
  content: string;
  onSave: (content: string) => void;
  autoFocus?: boolean;
  onSlashCommand?: (caretRect: DOMRect, textBefore: string, textAfter: string) => void;
  onDelete?: () => void;
  onSplit?: (textBefore: string, textAfter: string) => void;
}

export default function ParagraphWidget({
  content,
  onSave,
  autoFocus,
  onSlashCommand,
  onDelete,
  onSplit,
}: ParagraphWidgetProps) {
  const [localValue, setLocalValue] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFocusedRef = useRef(false);

  const displayValue = localValue ?? content;

  const resize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, []);

  useEffect(() => {
    resize();
  }, [displayValue, resize]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  function handleFocus() {
    isFocusedRef.current = true;
    setLocalValue(content);
  }

  function handleBlur() {
    isFocusedRef.current = false;
    if (localValue !== null && localValue !== content) {
      onSave(localValue);
    }
    setLocalValue(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Detect "/" typed
    const ta = textareaRef.current;
    if (!ta) return;
    const cursorPos = ta.selectionStart;
    if (cursorPos > 0 && newValue[cursorPos - 1] === '/') {
      const textBefore = newValue.slice(0, cursorPos - 1);
      const textAfter = newValue.slice(cursorPos);

      if (onSlashCommand) {
        const rect = getCaretRect(ta, cursorPos - 1);
        if (rect) {
          onSlashCommand(rect, textBefore, textAfter);
        }
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
      const before = value.slice(0, pos);
      const after = value.slice(pos);
      onSplit(before, after);
      return;
    }
    if (e.key === 'Backspace' && displayValue === '' && onDelete) {
      e.preventDefault();
      onDelete();
    }
  }

  return (
    <textarea
      ref={textareaRef}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="Tapez du texte ou / pour les commandes..."
      className="w-full resize-none bg-transparent text-base leading-relaxed outline-none border-0 border-l-2 border-transparent focus:border-border transition-colors placeholder:text-muted-foreground/50 py-2"
      rows={1}
    />
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
  const textNode = document.createTextNode(textBefore);
  mirror.appendChild(textNode);

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
