# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run tauri        # Tauri dev mode
npm run build        # Next.js static export → ./out
npm run build:tauri  # Full Tauri production build local (macOS only)
npm run lint

# Regénérer les icônes depuis le SVG source
npx tauri icon <path/to/icon.svg>
```

No test suite.

**Production builds** : via GitHub Actions (`.github/workflows/build.yml`), déclenché par un tag `v*` (`git tag vX.Y.Z && git push origin vX.Y.Z`). Produit `.dmg` (macOS arm64 + x64) et `.exe` NSIS (Windows x64).

**Branche principale** : `main`. Licence MIT.

## Architecture

Tauri v2 desktop app wrapping a Next.js 15 static export. No backend/API. All data on local filesystem via Rust commands.

**Document-centric**: one project open at a time, stored as a plain JSON `.scope` file.

### Routing (`app/page.tsx`)

Single page acting as client router:
- no `activeProjectId` → `HomeScreen`
- `activeProjectId` → `ComponentList` (sidebar + dashboard or item detail)

Also registers global Tauri event listeners: `menu-open-file` and `menu-close-project` (triggered by native macOS menu).

### State (`lib/store/`)

Zustand store split into 4 slices: `projectSlice`, `componentSlice`, `taskSlice`, `instanceSlice`.

`projectSlice` holds `projects` (0 or 1 item), `activeProjectId`, `currentProjectPath`.

### Persistence (`lib/persistence.ts` + `lib/projectStore.ts`)

- **Open**: `openProjectFile(path)` → `openProject(project, path)`. Always call `initPreviousProject(project)` before `openProject` to avoid a spurious auto-save on load.
- **Auto-save**: subscribe in `lib/projectStore.ts` compares `projects[0]` by reference → calls `saveProjectToPath` on any change.
- **Close/switch**: `closeProject()` → back to `HomeScreen`.
- **Recent files**: last 3 paths in `config.dat` (`recentFiles: Array<{name, path, openedAt}>`).
- **No in-app deletion** — users delete `.scope` files from Finder.
- **Export/backup**: gzip archive wrapping `{ projects: [] }` via `lib/backup.ts`. `load_project_file` (Rust) handles both plain JSON and gzip.

Rust commands (`src-tauri/src/main.rs`): `save_project_file`, `load_project_file`, `list_scope_files`, `delete_project_file`, `rename_project_file`, `write_pdf_file`.

Native macOS menu (`src-tauri/src/main.rs` `.setup()`):
- `SCOPE` : Ouvrir un fichier… (Cmd+O), Fermer le projet (Cmd+W), Quitter. Menu events emit Tauri events to the frontend.
- `Édition` : Annuler, Rétablir, Couper, Copier, Coller, Tout sélectionner — via `PredefinedMenuItem`. Requis pour activer les raccourcis texte natifs (Cmd+A etc.) dans les champs de l'app.

**Recent files** : au clic sur un fichier récent manquant, une modale avertit l'utilisateur et l'entrée est retirée de la liste (`removeRecentFile` dans `lib/persistence.ts`).

Config in `config.dat` via `@tauri-apps/plugin-store` (separate from project data).

### Type system & Widgets (`lib/scope.config.json`)

4 element types configured in `lib/scope.config.json`: `document`, `component`, `template`, `section`. Each type has default widgets, configurable per element.

- `ScopeItemType = 'document' | 'component' | 'template' | 'section'`
- `ComponentCategory` is an alias for `ScopeItemType` (compat)
- `WidgetType = 'notes' | 'images' | 'tasks' | 'instances' | 'paragraph'`
- `Component.widgets?: WidgetType[]` — when undefined, uses type defaults from config
- Singleton widgets (`images`, `tasks`, `instances`): only one instance per element. `notes` and `paragraph` allow multiple instances.

Default widgets:
| Type | Widgets |
|------|---------|
| document | notes, tasks, instances |
| component | images, tasks, instances |
| template | images, notes, tasks, instances |
| section | images, tasks, instances |

`getActiveWidgets(item)` in `lib/categoryHelpers.ts` returns `item.widgets ?? DEFAULT_WIDGETS[item.category]`.

Widget toggle UI in `ScopeItemDetail.tsx` allows enabling/disabling widgets per element.

### Data types (`lib/types.ts`)

- `Project`: `{ id, name, description?, filename?, hourlyRate?, budgetCap?, components[], createdAt }`
- `Component`: `{ category: ScopeItemType, tasks[], instances[], images[], content?, estimatedHours?, widgets? }`
- `Task`: `{ id, name, completed, category: 'frontend'|'backend'|'seo'|'motion', pinRef? }` — `pinRef: { imageId, pinId, pinNumber }` links a task to an image pin
- `ComponentImage`: `{ id, base64, caption?, isPrimary, pins? }` — supersedes legacy `imageBase64` field (migration in `lib/migrations.ts`)
- `ImagePin`: `{ id, number, x, y }` — x/y are percentages (0-100) relative to the image container
- `ComponentInstance`: `{ id, componentId, pinRef? }` — `pinRef: { imageId, pinId, pinNumber }` links an instance to an image pin

### Detail view (`components/ScopeItemDetail.tsx`)

Unified detail view for all element types. Renders a header (title, type badge, description, hours, edit/delete) then widgets in order based on `getActiveWidgets(item)`:
- `'images'` → `ImagePinViewer`
- `'notes'` → `NoteWidget`
- `'paragraph'` → `ParagraphWidget`
- `'tasks'` → `TaskList`
- `'instances'` → `ComponentInstanceList`

**NoteWidget** (`components/NoteWidget.tsx`): standalone markdown editor/viewer. Props: `{ content, onSave }`. Manages its own edit/preview state.

**ParagraphWidget** (`components/ParagraphWidget.tsx`): inline-editable textarea (no markdown). Auto-resize, save on blur. Typing `/` triggers a slash command menu (`SlashCommandMenu`) to insert a widget at the cursor position — text is split around the `/`, chosen widget inserted between. Backspace on empty paragraph deletes it.

**WidgetInserter** (`components/molecules/WidgetInserter.tsx`): Notion-like inserter between widgets. Click on the zone creates a paragraph (auto-focused). The `+` button opens a `DropdownMenu` with all available widget types. Appears on hover.

**SlashCommandMenu** (`components/molecules/SlashCommandMenu.tsx`): fixed-position dropdown triggered by `/` in a paragraph. Filters available widgets as user types. Keyboard navigation (arrows, Enter, Escape).

Both `paragraph` and `notes` store their content in `Component.notes[]` (same `NoteData` structure, keyed by widget ID). The `WidgetInstance.type` distinguishes rendering.

Edit mode uses `ComponentEditForm` (name, description, type selector, hours, image gallery).

### Éléments (anciennement Tâches)

Le terme "Tâches" est remplacé par "Éléments" dans toute l'interface. Le champ `completed` et l'action `toggleTask` existent toujours dans le store mais les checkboxes sont masquées. Le terme "Tâches" est conservé dans l'export STORIES.md.

### Pins sur images (`components/ImagePinViewer.tsx`)

`ImagePinViewer` is rendered as the `'images'` widget. It manages pin overlay on each image:
- Click on image → creates a pin and drags immediately
- Click on existing pin → selection (red)
- Drag pin → repositions (native pointer events, % coords)
- Delete key with selected pin → removes pin
- Eye button → show/hide all pins
- Pins saved in `ComponentImage.pins[]` via `onUpdateImages` → `updateComponent`

Pin ↔ element link: in `TaskItem` edit form, a `Select` for picking a pin. Stored in `Task.pinRef`. Badge `#N` displayed if linked.

Pin ↔ instance link: in `InstanceItem`, a `MapPin` button opens inline `Select`. Stored in `ComponentInstance.pinRef`.

**Drag & drop**: components reorderable in sidebar by type (`@dnd-kit`, action `reorderComponents`). Images reorderable in thumbnail strip.

### Navigation (`components/ComponentList.tsx`)

`navHistory: string[]` stack — last item is active component. Sidebar click resets stack, instance link pushes to stack, back button pops. `onGoHome` resets to `[]` (shows dashboard).

### PDF export (`components/pdf/ProjectPDFDocument.tsx`)

4 pages: overview → sommaire (with internal `#anchor` links) → component details (tasks + instances + markdown content if notes widget active + paragraph plain text) → bon pour accord. Dynamic import via `lib/pdfExport.tsx` to avoid SSR issues. PDF bytes transferred to Rust as base64.

**Pins dans le PDF** : avant génération, `preparePdfProject` (dans `lib/pdfExport.tsx`) pré-cuit les pins dans les images via Canvas (`renderImageWithPins`, exportée depuis `lib/imageHelpers.ts`). Les images passées au renderer n'ont plus de `pins[]` — pas d'overlay dans `ProjectPDFDocument`.

**Ordre dans les exports** : les types sont ordonnés selon `PDF_DISPLAY_ORDER` (document en premier).

### Styling

Tailwind CSS 4, OKLch color space, CSS variables in `styles/global.css`. Use `cn()` from `lib/utils.ts`. shadcn/ui `new-york` style + lucide icons. No hardcoded colors. `@plugin "@tailwindcss/typography"` required for prose/markdown rendering.

### Vision

SCOPE = cadrage client (composants, mockups, estimations, PDF). Story-compiler = développement. Lien = export `STORIES.md`. Voir `docs/philosophie-et-integrations.md`.

## Roadmap

Voir [`docs/todo.md`](./docs/todo.md) pour les bugs connus et les fonctionnalités à venir.
