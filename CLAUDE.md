# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vision & intégrations

Voir [`docs/philosophie-et-integrations.md`](./docs/philosophie-et-integrations.md) pour la philosophie du projet et l'intégration avec **Story-compiler**.

En résumé : SCOPE couvre la phase de cadrage (côté client — composants, mockups, estimations, PDF cahier des charges). Story-compiler prend le relais pour la phase de développement. Le lien entre les deux est un export `STORIES.md` généré par SCOPE.

## Commands

```bash
# Development
npm run dev          # Next.js dev server on http://localhost:3000
npm run tauri        # Tauri desktop app in dev mode (connects to dev server)

# Build
npm run build        # Next.js static export to ./out
npm run build:tauri  # Build Tauri desktop app (bundles ./out)

# Lint
npm run lint         # ESLint
```

No test suite is configured.

## Architecture

**SCOPE** is a Tauri v2 desktop app wrapping a Next.js 15 static export. There is no backend or API.

### Data flow

1. Next.js builds a static export to `./out`
2. Tauri serves `./out` in production, or proxies `http://localhost:3000` during dev
3. React Client Components handle all interactivity
4. Zustand store manages global state and auto-saves on every change via middleware
5. Persistence uses plain JSON `.scope` files on the filesystem (via Rust commands)

### Persistence model — one `.scope` file per project

SCOPE is **document-centric**: one project is open at a time, stored in a single `.scope` file (plain JSON) chosen by the user.

- **Open a project**: file picker → `openProjectFile(path)` → `useProjectStore.openProject(project, path)`
- **Create a project**: user types a name → save dialog → `createNewProjectFile(name)` → file created → project opened
- **Auto-save**: `useProjectStore.subscribe()` in `lib/projectStore.ts` detects any change to `projects[0]` and calls `saveProjectToPath(currentProjectPath, project)`. Call `initPreviousProject(project)` before `setState` to prevent a spurious save on load.
- **Close / switch project**: `closeProject()` clears `projects`, `activeProjectId`, `currentProjectPath`. User goes back to `HomeScreen` and opens another file.
- **No deletion from the app** — users delete `.scope` files directly from Finder.
- **Recent files**: last 3 opened file paths stored in `config.dat` via `getRecentFiles()` / `addRecentFile()`.
- **Export**: a project can be exported as a gzip `.scope` archive (for sharing/backup) via `exportProject()` in `lib/backup.ts`. The gzip format wraps `{ projects: [...] }` in a `ScopeFile` envelope. `load_project_file` (Rust) handles both plain JSON and gzip automatically.

Rust filesystem commands (in `src-tauri/src/main.rs`):
- `save_project_file(path, data)` — write plain JSON
- `load_project_file(path)` — read plain JSON, falls back to gzip if needed
- `list_scope_files(dir)` — list `.scope` files in a directory
- `delete_project_file(path)` — delete a file
- `rename_project_file(old_path, new_path)` — rename a file

Config is stored in `config.dat` (via `@tauri-apps/plugin-store`):
- `recentFiles` — `Array<{ name, path, openedAt }>`, max 3 entries

### State management (`lib/store/`)

The Zustand store is composed of four slices:

- `projectSlice` — holds `projects` (0 or 1 item), `activeProjectId`, `currentProjectPath`; exposes `openProject()`, `closeProject()`, `updateProject()`
- `componentSlice` — component CRUD, active component selection; `canDeleteComponent()` prevents deletion of components used as instances elsewhere
- `taskSlice` — task CRUD and toggle within a component
- `instanceSlice` — component-instance references (tracking reuse of components)

Auto-save is wired in `lib/projectStore.ts` via `useProjectStore.subscribe()`. The subscribe compares `projects[0]` by reference — any mutation creates a new object, triggering a save.

### Data types (`lib/types.ts`)

Key interfaces:
- `Project` → `{ id, name, filename?, components[], createdAt }`; `filename` is the slugified name used when exporting
- `Component` → has `category`, `tasks[]`, `instances[]`, `images[]` (base64-encoded), optional `content` (for `document` category)
- `Task` → has `category: 'frontend' | 'backend' | 'seo' | 'motion'`
- `ComponentImage` → `base64` string + `isPrimary` flag

Legacy field `imageBase64` on `Component` is superseded by `images[]`. Migration runs in `lib/migrations.ts`.

### Routing / navigation

The app has a single Next.js page (`app/page.tsx`) that acts as a client-side router:

- `activeProjectId === null` → `HomeScreen` (open/create project, recent files)
- `activeProjectId` set, `activeComponentId === null` → `ComponentList` (sidebar + grid)
- both set → `ComponentDetail` / `DocumentDetailView`

Navigation state is held in the Zustand store (`activeProjectId`, `activeComponentId`).

### Component structure

```
components/
  ui/              # shadcn/ui primitives (do not edit directly)
  molecules/       # Reusable mid-level components
  forms/           # Controlled form components
  modals/          # Dialog-based creation flows
  HomeScreen.tsx   # Home screen: recent files, create, open
  ComponentList.tsx
  ProjectHeader.tsx
  *.tsx            # Other page-level / feature components
```

All interactive components use `'use client'`. shadcn/ui is configured with the `new-york` style and `lucide` icons.

### Styling

- Tailwind CSS 4 with CSS variables using OKLch color space (defined in `styles/global.css`)
- Light/dark mode variables are defined; use CSS variables (`--color-*`) rather than hardcoded colors
- `cn()` from `lib/utils.ts` combines `clsx` + `tailwind-merge` — use it for conditional class names
