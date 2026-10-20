'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { WidgetType } from '@/lib/types';
import { WIDGET_LABELS, WIDGET_ICONS } from '@/lib/categoryHelpers';

interface SlashCommandMenuProps {
  position: { top: number; left: number };
  availableWidgets: WidgetType[];
  onSelect: (type: WidgetType) => void;
  onClose: () => void;
  filter: string;
}

function SlashCommandMenuInner({
  position,
  availableWidgets,
  onSelect,
  onClose,
  filter,
}: SlashCommandMenuProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = availableWidgets.filter((w) =>
    WIDGET_LABELS[w].toLowerCase().includes(filter.toLowerCase())
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Les touches du menu ne doivent pas atteindre la zone de texte (Entrée y couperait le bloc).
      const consume = () => { e.preventDefault(); e.stopPropagation(); };
      if (e.key === 'ArrowDown' && filtered.length > 0) {
        consume();
        setActiveIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp' && filtered.length > 0) {
        consume();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        consume();
        if (filtered[activeIndex]) onSelect(filtered[activeIndex]);
        else onClose();
      } else if (e.key === 'Escape') {
        consume();
        onClose();
      }
    },
    [filtered, activeIndex, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const MARGIN = 12;
    const CARET_LINE = 28; // hauteur approximative de la ligne qui porte le curseur
    const height = menu.scrollHeight;
    const below = window.innerHeight - position.top - 4 - MARGIN;
    const above = position.top - CARET_LINE - MARGIN;
    // Emplacement réel : sous le curseur s'il y tient, sinon au-dessus, sinon sous le curseur avec défilement.
    // Posé directement sur l'élément (avant l'affichage) : pas de rendu supplémentaire.
    menu.style.maxHeight = '';
    if (height <= below) {
      menu.style.top = `${position.top + 4}px`;
    } else if (above > below) {
      menu.style.top = `${position.top - CARET_LINE - Math.min(height, above)}px`;
      menu.style.maxHeight = `${above}px`;
    } else {
      menu.style.top = `${position.top + 4}px`;
      menu.style.maxHeight = `${below}px`;
    }
  }, [position.top, filtered.length]);

  // Le choix au clavier reste visible quand la liste défile.
  useEffect(() => {
    menuRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (filtered.length === 0) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 bg-popover border rounded-md shadow-md p-2 text-sm text-muted-foreground"
        style={{ top: position.top + 4, left: position.left }}
      >
        Aucun widget trouvé
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border rounded-md shadow-md p-1 min-w-48 overflow-y-auto"
      style={{ top: position.top + 4, left: position.left }}
    >
      {filtered.map((w, i) => {
        const Icon = WIDGET_ICONS[w];
        return (
          <button
            key={`${w}-${i}`}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-sm transition-colors ${
              i === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
            }`}
            data-active={i === activeIndex}
            onMouseEnter={() => setActiveIndex(i)}
            onClick={() => onSelect(w)}
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            {WIDGET_LABELS[w]}
          </button>
        );
      })}
    </div>
  );
}

// Use filter as key to reset activeIndex when filter changes
export default function SlashCommandMenu(props: SlashCommandMenuProps) {
  return <SlashCommandMenuInner key={props.filter} {...props} />;
}
