# Plan : Unification Document/Composant — Système de types + widgets

> Statut : **À implémenter** — plan finalisé, pas encore commencé.

## Contexte

Actuellement, "Document" et "Composant" sont le même type `Component` avec un traitement spécial partout dans le code (`category === 'document'`). L'objectif est de créer un système unifié : un **élément du scope** avec un `type` parmi 4 valeurs, et des **widgets configurables** (notes, maquettes, éléments, composants utilisés) déterminés par le type avec possibilité de personnalisation par élément.

**Widgets disponibles :**

| Widget | Id | Composant React |
|--------|-----|----------------|
| Notes (markdown) | `'notes'` | `NoteWidget.tsx` |
| Maquettes (images + pins) | `'images'` | `ImagePinViewer.tsx` |
| Éléments (todo) | `'tasks'` | `TaskList.tsx` |
| Composants utilisés | `'instances'` | `ComponentInstanceList.tsx` |

**Widgets par défaut par type :**

| Type | Défaut |
|------|--------|
| `document` | notes, tasks, instances |
| `component` | images, tasks, instances |
| `template` | images, notes, tasks, instances |
| `section` | images, tasks, instances |

## Fichier de configuration `lib/scope.config.json`

Toute la configuration du système de types et widgets est externalisée dans un fichier JSON. Ajouter un type = éditer le JSON uniquement.

```json
{
  "itemTypes": [
    {
      "id": "document",
      "label": "Document",
      "color": "bg-slate-100 text-slate-700",
      "defaultWidgets": ["notes", "tasks", "instances"]
    },
    {
      "id": "component",
      "label": "Composant",
      "color": "bg-blue-100 text-blue-700",
      "defaultWidgets": ["images", "tasks", "instances"]
    },
    {
      "id": "template",
      "label": "Template",
      "color": "bg-purple-100 text-purple-700",
      "defaultWidgets": ["images", "notes", "tasks", "instances"]
    },
    {
      "id": "section",
      "label": "Section",
      "color": "bg-green-100 text-green-700",
      "defaultWidgets": ["images", "tasks", "instances"]
    }
  ],
  "widgets": [
    { "id": "notes",     "label": "Notes" },
    { "id": "images",    "label": "Maquettes" },
    { "id": "tasks",     "label": "Éléments" },
    { "id": "instances", "label": "Composants utilisés" }
  ]
}
```

`lib/categoryHelpers.ts` importe ce fichier et en dérive toutes les constantes (labels, couleurs, defaults).

## Fichiers à modifier

**Types & store :**
- `lib/types.ts` — changer `ComponentCategory`, ajouter `WidgetType` et `widgets?`
- `lib/categoryHelpers.ts` — remplacer les 9 catégories par 4 types + constantes widgets
- `lib/migrations.ts` — migrer les anciennes catégories vers les 4 nouveaux types

**UI :**
- `components/ComponentList.tsx` — supprimer la dichotomie document/composant
- `components/ComponentSidebar.tsx` — sidebar unifiée par type
- `components/CreateComponentModal.tsx` — sélecteur de 4 types
- `components/ComponentEditForm.tsx` — sélecteur de 4 types (remplacer le blocage document)
- `components/ProjectHeader.tsx` — bouton unique "Nouvel élément"
- **Nouveau** `components/ScopeItemDetail.tsx` — vue unifiée remplaçant `ComponentDetail.tsx` + `DocumentDetailView.tsx`

**Exports :**
- `lib/markdownExport.ts` — remplacer `category === 'document'` par présence du widget 'notes'
- `components/pdf/ProjectPDFDocument.tsx` — idem

## Plan d'implémentation détaillé

### 1. `lib/types.ts`

```typescript
export type ScopeItemType = 'document' | 'component' | 'template' | 'section';
export type ComponentCategory = ScopeItemType; // alias pour compat

export type WidgetType = 'notes' | 'images' | 'tasks' | 'instances';

export interface Component {
  // ... champs existants inchangés ...
  category: ScopeItemType;
  widgets?: WidgetType[]; // undefined = defaults du type
}
```

### 2. `lib/categoryHelpers.ts`

- `SCOPE_ITEM_TYPES`: `['document', 'component', 'template', 'section']`
- `TYPE_LABELS`, `TYPE_COLORS` dérivés du config JSON
- `DEFAULT_WIDGETS`: map type → WidgetType[]
- `WIDGET_LABELS`: `{ notes: 'Notes', images: 'Maquettes', tasks: 'Éléments', instances: 'Composants utilisés' }`
- `getActiveWidgets(item: Component): WidgetType[]` → `item.widgets ?? DEFAULT_WIDGETS[item.category]`
- Retirer `COMPONENT_CATEGORIES` (plus nécessaire)

### 3. `lib/migrations.ts`

Migration des anciennes catégories :
```
'document' → 'document'
'template' → 'template'
'section'  → 'section'
tout autre → 'component'
```

### 4. Nouveau `components/ScopeItemDetail.tsx`

Vue unifiée. Props : `{ projectId, componentId }`.

Rendu :
1. **Header** : titre, type badge, description, estimatedHours, Edit/Delete
2. **Widgets** : boucle sur `getActiveWidgets(item)`
   - `'images'` → `<ImagePinViewer>`
   - `'notes'` → `<NoteWidget>`
   - `'tasks'` → `<TaskList>`
   - `'instances'` → `<ComponentInstanceList>`
3. **Widget manager** : bouton "⊕ Widgets" pour activer/désactiver. Sauvegarde via `updateComponent(id, { widgets })`.

### 5. `components/ComponentList.tsx`

- Supprimer `isDocumentModalOpen`, `isDocument`, double modal, ternaire document/composant
- Un seul `<CreateComponentModal>` et `<ScopeItemDetail>`

### 6. `components/ComponentSidebar.tsx`

- 4 sections de types égaux (ordre : document → template → section → component)
- Supprimer séparateur et section document spéciale

### 7. `components/CreateComponentModal.tsx`

- Remplacer prop `isDocument` par sélecteur de type (4 options depuis config)

### 8. `components/ComponentEditForm.tsx`

- Remplacer blocage catégorie document par sélecteur normal sur 4 types

### 9. `components/ProjectHeader.tsx`

- 1 bouton "Nouvel élément" (remplace les 2 boutons actuels)

### 10. Exports

- `lib/markdownExport.ts` : `getActiveWidgets(c).includes('notes')` remplace `c.category === 'document'`
- `components/pdf/ProjectPDFDocument.tsx` : idem

## Ordre d'exécution

1. `lib/scope.config.json`
2. `lib/types.ts` + `lib/categoryHelpers.ts`
3. `lib/migrations.ts`
4. `components/ScopeItemDetail.tsx`
5. `components/ComponentList.tsx`
6. `components/ComponentSidebar.tsx` + `CreateComponentModal.tsx` + `ComponentEditForm.tsx`
7. `components/ProjectHeader.tsx`
8. Exports (markdownExport, PDF)
9. Supprimer `ComponentDetail.tsx` et `DocumentDetailView.tsx`

## Vérification

- Créer un élément de chaque type → widgets par défaut corrects
- Activer/désactiver un widget → persisté dans le `.scope`
- Recharger un projet existant → anciennes catégories migrées
- Export PDF → contenu markdown pour les éléments avec widget 'notes'
- Export STORIES.md → structure correcte
