'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { WidgetType } from '@/lib/types';
import { WIDGET_ICONS, WIDGET_LABELS } from '@/lib/categoryHelpers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Actions d'un bloc : « + » (insérer en dessous) et menu de la poignée (déplacer, dupliquer, transformer, supprimer). */
export interface BlockActions {
  /** Types proposés par le « + » (même liste que le menu « / »). */
  addTypes: WidgetType[];
  onAddAfter: (type: WidgetType) => void;
  onMove: (delta: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDuplicate?: () => void;
  /** Types vers lesquels ce bloc peut être transformé (texte uniquement). */
  turnIntoTypes?: WidgetType[];
  currentType: WidgetType;
  onTurnInto?: (type: WidgetType) => void;
}

interface SortableWidgetProps {
  id: string;
  label: string;
  icon: LucideIcon;
  onRemove: () => void;
  actions?: BlockActions;
  /** Bloc pas encore créé (paragraphe vide en fin de page) : pas de « + » ni de poignée, mais la marge reste. */
  placeholder?: boolean;
  /** Espacement vertical du bloc (par défaut celui d'un gros bloc : une demi-ligne de chaque côté). */
  spacing?: string;
  children: ReactNode;
}

export default function SortableWidget({ id, onRemove, actions, placeholder, spacing = 'py-3', children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // La poignée sert à glisser (drag) ET à ouvrir le menu (clic) : un clic qui termine un glissement n'ouvre rien.
  const [menuOpen, setMenuOpen] = useState(false);
  const dragged = useRef(false);
  useEffect(() => { if (isDragging) dragged.current = true; }, [isDragging]);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`rounded-xl ${spacing} group/widget relative flex gap-1 ${isDragging ? 'h-8 overflow-hidden rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30' : ''}`}
    >
      {!isDragging && (
        <div
          className={`flex items-start gap-0.5 shrink-0 transition-opacity ${placeholder ? 'invisible pointer-events-none' : ''} ${menuOpen ? 'opacity-100' : 'opacity-0 group-hover/widget:opacity-100 focus-within:opacity-100'}`}
        >
          {actions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-foreground hover:bg-accent p-0.5 rounded"
                  title="Ajouter un bloc en dessous"
                  aria-label="Ajouter un bloc en dessous"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {actions.addTypes.map((type) => {
                  const Icon = WIDGET_ICONS[type];
                  return (
                    <DropdownMenuItem key={type} onClick={() => actions.onAddAfter(type)}>
                      <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                      {WIDGET_LABELS[type]}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            {/* Ancre du menu : l'ouverture se fait au clic de la poignée, pas au début d'un glissement. */}
            <DropdownMenuTrigger asChild>
              <span className="absolute w-6 h-6 pointer-events-none" aria-hidden />
            </DropdownMenuTrigger>
            <button
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-accent p-0.5 rounded"
              title="Glisser pour déplacer, cliquer pour le menu"
              aria-label="Menu du bloc"
              {...attributes}
              {...listeners}
              onPointerDown={(e) => { dragged.current = false; listeners?.onPointerDown?.(e); }}
              onClick={() => { if (!dragged.current) setMenuOpen(true); }}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <DropdownMenuContent align="start">
              {actions?.turnIntoTypes && actions.onTurnInto && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Transformer en</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {actions.turnIntoTypes.filter((t) => t !== actions.currentType).map((type) => {
                      const Icon = WIDGET_ICONS[type];
                      return (
                        <DropdownMenuItem key={type} onClick={() => actions.onTurnInto!(type)}>
                          <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                          {WIDGET_LABELS[type]}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {actions?.onDuplicate && (
                <DropdownMenuItem onClick={actions.onDuplicate}>
                  <Copy className="h-4 w-4 mr-2 text-muted-foreground" /> Dupliquer
                </DropdownMenuItem>
              )}
              {actions && (
                <>
                  <DropdownMenuItem disabled={!actions.canMoveUp} onClick={() => actions.onMove(-1)}>
                    <ArrowUp className="h-4 w-4 mr-2 text-muted-foreground" /> Monter
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!actions.canMoveDown} onClick={() => actions.onMove(1)}>
                    <ArrowDown className="h-4 w-4 mr-2 text-muted-foreground" /> Descendre
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onRemove}>
                <Trash2 className="h-4 w-4 mr-2" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <div className={`flex-1 min-w-0 ${isDragging ? 'invisible' : ''}`}>
        {children}
      </div>
    </div>
  );
}
