# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run tauri        # Tauri dev mode
npm run build        # Next.js static export → ./out
npm run build:tauri  # Full Tauri production build + DMG
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

Config in `config.dat` via `@tauri-apps/plugin-store` (separate from project data).

### Data types (`lib/types.ts`)

- `Project`: `{ id, name, description?, filename?, components[], createdAt }`
- `Component`: `{ category, tasks[], instances[], images[], content? }` — `filename` is slugified name for file exports
- `Task`: `{ category: 'frontend'|'backend'|'seo'|'motion' }`
- `ComponentImage`: `{ base64, isPrimary }` — supersedes legacy `imageBase64` field (migration in `lib/migrations.ts`)

### PDF export (`components/pdf/ProjectPDFDocument.tsx`)

4 pages: overview → sommaire (with internal `#anchor` links) → component details (tasks + instances) → bon pour accord. Dynamic import via `lib/pdfExport.tsx` to avoid SSR issues. PDF bytes transferred to Rust as base64.

### Styling

Tailwind CSS 4, OKLch color space, CSS variables in `styles/global.css`. Use `cn()` from `lib/utils.ts`. shadcn/ui `new-york` style + lucide icons. No hardcoded colors.

### Vision

SCOPE = cadrage client (composants, mockups, estimations, PDF). Story-compiler = développement. Lien = export `STORIES.md`. Voir `docs/philosophie-et-integrations.md`.
