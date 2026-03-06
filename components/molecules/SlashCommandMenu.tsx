'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIndex]) onSelect(filtered[activeIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
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
      className="fixed z-50 bg-popover border rounded-md shadow-md p-1 min-w-48"
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
