# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run tauri        # Tauri dev mode
npm run build        # Next.js static export → ./out
npm run build:tauri  # Full Tauri production build (DMG may fail, .app is generated)
npm run lint
```

No test suite.

## Architecture

Tauri v2 desktop app wrapping a Next.js 15 static export. No backend/API. All data on local filesystem via Rust commands.

**Document-centric**: one project open at a time, stored as a plain JSON `.scope` file.

### Routing (`app/page.tsx`)

Single page acting as client router:
- no `activeProjectId` → `HomeScreen`
- `activeProjectId` only → `ComponentList` (sidebar + dashboard or component detail)
- both `activeProjectId` + `activeComponentId` → `ComponentDetail` / `DocumentDetailView`

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

Native macOS menu (`src-tauri/src/main.rs` `.setup()`): `SCOPE > Ouvrir un fichier… (Cmd+O)`, `SCOPE > Fermer le projet (Cmd+W)`, `Quitter`. Menu events emit Tauri events to the frontend.

Config in `config.dat` via `@tauri-apps/plugin-store` (separate from project data).

### Data types (`lib/types.ts`)

- `Project`: `{ id, name, description?, filename?, hourlyRate?, budgetCap?, components[], createdAt }`
- `Component`: `{ category, tasks[], instances[], images[], content?, estimatedHours? }` — category `'document'` is separate from other categories
- `Task`: `{ id, name, completed, category: 'frontend'|'backend'|'seo'|'motion', pinRef? }` — `pinRef: { imageId, pinId, pinNumber }` links a task to an image pin
- `ComponentImage`: `{ id, base64, caption?, isPrimary, pins? }` — supersedes legacy `imageBase64` field (migration in `lib/migrations.ts`)
- `ImagePin`: `{ id, number, x, y }` — x/y are percentages (0–100) relative to the image container

### Éléments (anciennement Tâches)

Le terme "Tâches" est remplacé par "Éléments" dans toute l'interface. Le champ `completed` et l'action `toggleTask` existent toujours dans le store mais les checkboxes sont masquées. Le terme "Tâches" est conservé dans l'export STORIES.md.

### Pins sur images (`components/ImagePinViewer.tsx`)

`ImagePinViewer` remplace `ImageCarousel` dans `ComponentDetailHeader`. Il gère l'overlay de pins sur chaque image du carousel :
- Clic sur l'image → crée un pin et le glisse immédiatement
- Clic sur un pin existant → sélection (rouge)
- Drag sur un pin → repositionnement (pointer events natifs, coordonnées en %)
- Touche `Delete` avec un pin sélectionné → suppression
- Bouton œil → affiche/masque tous les pins
- Les pins sont sauvegardés dans `ComponentImage.pins[]` via `onUpdateImages` → `updateComponent`

Liaison pin ↔ élément : dans le formulaire d'édition d'un élément (`TaskItem`), un `Select` permet de choisir un pin parmi ceux disponibles sur toutes les images du composant. La référence est stockée dans `Task.pinRef`. Un badge `📍 #N` s'affiche en lecture si un pin est lié.

`TaskList` reçoit une prop optionnelle `images?: ComponentImage[]` et calcule `availablePins` (liste plate de tous les pins de toutes les images) passée à chaque `TaskItem`.

### Navigation (`components/ComponentList.tsx`)

`navHistory: string[]` stack — last item is active component. Sidebar click resets stack, instance link pushes to stack, back button pops. `onGoHome` resets to `[]` (shows dashboard).

### Component vs Document

Category `'document'` is isolated: separate sidebar section (top), separate creation modal, separate detail view (`DocumentDetailView`). Use `COMPONENT_CATEGORIES` from `lib/categoryHelpers.ts` (excludes `'document'`) for component selects.

### PDF export (`components/pdf/ProjectPDFDocument.tsx`)

4 pages: overview → sommaire (with internal `#anchor` links) → component details (tasks + instances + markdown content for documents) → bon pour accord. Dynamic import via `lib/pdfExport.tsx` to avoid SSR issues. PDF bytes transferred to Rust as base64.

### Styling

Tailwind CSS 4, OKLch color space, CSS variables in `styles/global.css`. Use `cn()` from `lib/utils.ts`. shadcn/ui `new-york` style + lucide icons. No hardcoded colors. `@plugin "@tailwindcss/typography"` required for prose/markdown rendering.

### Vision

SCOPE = cadrage client (composants, mockups, estimations, PDF). Story-compiler = développement. Lien = export `STORIES.md`. Voir `docs/philosophie-et-integrations.md`.

## Roadmap

Voir [`docs/todo.md`](./docs/todo.md) pour les bugs connus et les fonctionnalités à venir.
