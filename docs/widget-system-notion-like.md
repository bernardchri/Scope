# Systeme de widgets Notion-like avec drag & drop

## Contexte

Les widgets dans ScopeItemDetail sont actuellement affiches dans un ordre fixe avec des separateurs rigides et un toggle UI peu intuitif en bas de page. L'objectif est de se rapprocher d'un fonctionnement Notion : reordonner les widgets par drag & drop, ajouter via un bouton "+" subtil qui apparait au survol entre les blocs, et supprimer avec avertissement si le widget contient des donnees.

**Note** : pas de widgets dupliques pour l'instant -- le modele de donnees (`content`, `images[]`, `tasks[]`, `instances[]`) ne le supporte pas. "Autant que je veux" = liberte d'ajouter/retirer n'importe quel type.

## Fichiers a modifier

| Fichier | Changement |
|---------|-----------|
| `components/ui/alert-dialog.tsx` | **Nouveau** -- installer via `npx shadcn@latest add alert-dialog` |
| `lib/categoryHelpers.ts` | Ajouter `widgetHasContent()` + `WIDGET_ICONS` |
| `components/molecules/SortableWidget.tsx` | **Nouveau** -- wrapper sortable avec header (grip + label + X) |
| `components/molecules/WidgetInserter.tsx` | **Nouveau** -- boutons inline au hover entre les widgets |
| `components/ScopeItemDetail.tsx` | Integrer DndContext, DragOverlay, remplacer le rendu, supprimer l'ancien widget manager |

## Etapes

### 0. Installer AlertDialog shadcn

```bash
npx shadcn@latest add alert-dialog
```

### 1. `lib/categoryHelpers.ts` -- helpers

Ajouter `widgetHasContent` + `WIDGET_ICONS` (map WidgetType -> icone lucide) :

```typescript
import { FileText, Image, ListChecks, Layers } from 'lucide-react';

export const WIDGET_ICONS: Record<WidgetType, LucideIcon> = {
  notes: FileText,
  images: Image,
  tasks: ListChecks,
  instances: Layers,
};

export function widgetHasContent(item: Component, widget: WidgetType): boolean {
  switch (widget) {
    case 'images':    return (item.images?.length ?? 0) > 0;
    case 'notes':     return !!item.content?.trim();
    case 'tasks':     return item.tasks.length > 0;
    case 'instances': return item.instances.length > 0;
    default: return false;
  }
}
```

### 2. `components/molecules/SortableWidget.tsx` -- wrapper sortable

- Utilise `useSortable({ id })` comme `SortableTaskItem` dans `TaskList.tsx`
- **Header bar** visible au hover du bloc (`group-hover:opacity-100`) contenant :
  - Drag handle `GripVertical` a gauche (recoit `listeners` + `attributes`)
  - Label du widget (icone + texte depuis `WIDGET_LABELS` / `WIDGET_ICONS`)
  - Bouton supprimer `X` a droite, `hover:text-destructive`
- Le handle recoit `listeners` + `attributes` (pas le wrapper entier) pour eviter les conflits avec les interactions internes des widgets
- Props : `{ id: WidgetType, label: string, icon: LucideIcon, onRemove: () => void, children: ReactNode }`

### 3. `components/molecules/WidgetInserter.tsx` -- boutons inline entre les blocs

- Zone de ~64px de hauteur entre chaque widget
- Par defaut invisible, au hover affiche les widgets disponibles **directement en ligne** (pas de dropdown)
- Chaque bouton : icone + label depuis `WIDGET_LABELS` / `WIDGET_ICONS`, style `variant="ghost" size="sm"`
- Un seul clic pour ajouter (plus rapide qu'un dropdown pour 4 types max)
- Si tous les widgets sont actifs : zone invisible, rien a montrer
- Props : `{ availableWidgets: WidgetType[], onAdd: (widget: WidgetType) => void }`

Style CSS : `group py-4 flex items-center justify-center gap-2` avec `opacity-0 group-hover:opacity-100 transition-opacity`

### 4. `components/ScopeItemDetail.tsx` -- integration

**4a. Imports** : ajouter `DndContext`, `SortableContext`, `verticalListSortingStrategy`, `arrayMove`, `PointerSensor`, `useSensor`, `useSensors`, `DragOverlay`, plus `SortableWidget`, `WidgetInserter`, `widgetHasContent`, `WIDGET_ICONS`, `AlertDialog` components.

**4b. Sensors** : meme pattern que TaskList -- `PointerSensor` avec `distance: 5`.

**4c. State** : ajouter `activeId` (pour DragOverlay) et `pendingRemove` (pour AlertDialog) :

```typescript
const [activeId, setActiveId] = useState<WidgetType | null>(null);
const [pendingRemove, setPendingRemove] = useState<WidgetType | null>(null);
```

**4d. Nouvelles fonctions** (remplacent `toggleWidget`) :

```typescript
function addWidget(widget: WidgetType, position: number) {
  const current = [...activeWidgets];
  current.splice(position, 0, widget);
  onUpdate(item.id, { widgets: current });
}

function removeWidget(widget: WidgetType) {
  if (widgetHasContent(item, widget)) {
    setPendingRemove(widget);  // ouvre AlertDialog
    return;
  }
  onUpdate(item.id, { widgets: activeWidgets.filter(w => w !== widget) });
}

function confirmRemove() {
  if (!pendingRemove) return;
  onUpdate(item.id, { widgets: activeWidgets.filter(w => w !== pendingRemove) });
  setPendingRemove(null);
}

function handleDragEnd(event: DragEndEvent) {
  setActiveId(null);
  const { active, over } = event;
  if (over && active.id !== over.id) {
    const oldIdx = activeWidgets.indexOf(active.id as WidgetType);
    const newIdx = activeWidgets.indexOf(over.id as WidgetType);
    onUpdate(item.id, { widgets: arrayMove(activeWidgets, oldIdx, newIdx) });
  }
}
```

**4e. Nouveau rendu des widgets** (remplace lignes 158-193) :

```tsx
<WidgetInserter availableWidgets={available} onAdd={(w) => addWidget(w, 0)} />

<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={({ active }) => setActiveId(active.id as WidgetType)}
  onDragEnd={handleDragEnd}
>
  <SortableContext items={activeWidgets} strategy={verticalListSortingStrategy}>
    {activeWidgets.map((widget, i) => (
      <div key={widget}>
        <SortableWidget
          id={widget}
          label={WIDGET_LABELS[widget]}
          icon={WIDGET_ICONS[widget]}
          onRemove={() => removeWidget(widget)}
        >
          {renderWidget(widget)}
        </SortableWidget>
        <WidgetInserter availableWidgets={available} onAdd={(w) => addWidget(w, i + 1)} />
      </div>
    ))}
  </SortableContext>
  <DragOverlay>
    {activeId && (
      <div className="bg-background/80 backdrop-blur border rounded-lg shadow-lg p-3 flex items-center gap-2">
        {/* Icone + label du widget en cours de drag */}
      </div>
    )}
  </DragOverlay>
</DndContext>

{/* AlertDialog pour suppression avec contenu */}
<AlertDialog open={!!pendingRemove} onOpenChange={() => setPendingRemove(null)}>
  ...
</AlertDialog>
```

**4f. Supprimer** : `showWidgetManager` state, l'ancien widget manager UI, les `<Separator>` entre widgets, l'import de `Separator` (si plus utilise).

## Points importants

- **Suppression des donnees** : retirer un widget supprime ses donnees (`images: []`, `content: ''`, `tasks: []`, `instances: []`). L'AlertDialog previent l'utilisateur avant.
- **DndContext imbriques** : TaskList a son propre DndContext pour reordonner les taches -- pas de conflit car le drag handle du widget empeche la propagation.
- **DragOverlay** : montre une version simplifiee (icone + label + ombre) pendant le drag, evite les sauts visuels.
- **AlertDialog** : remplace le `confirm()` natif pour une UX coherente avec le reste de l'app.
- **Inserter inline** : les widgets disponibles sont affiches directement en boutons (pas de dropdown) -- un seul clic pour ajouter.
- **Exports PDF/Markdown** : appellent `getActiveWidgets()` qui lit `item.widgets` -- l'ordre est respecte automatiquement.
- **Materialisation des defaults** : au premier ajout/reorder/suppression, le tableau `widgets` est ecrit explicitement dans le component.

## Verification

- Hover entre deux widgets -> boutons des widgets disponibles apparaissent
- Clic sur un bouton widget -> il apparait a la position choisie
- Drag & drop un widget via le grip handle -> l'ordre change, DragOverlay visible pendant le drag
- Supprimer un widget vide -> suppression immediate
- Supprimer un widget avec contenu -> AlertDialog "Les donnees seront definitivement supprimees"
- Confirmer -> widget retire ET donnees effacees
- Plus de separateurs visibles entre les widgets, espacement naturel
- Header de widget (grip + label + X) visible au hover du bloc
