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

**SCOPE** is a Tauri v2 desktop app wrapping a Next.js 15 static export. There is no backend or API — all data is stored locally via `@tauri-apps/plugin-store`.

### Data flow

1. Next.js builds a static export to `./out`
2. Tauri serves `./out` in production, or proxies `http://localhost:3000` during dev
3. React Client Components handle all interactivity
4. Zustand store manages global state and auto-saves on every change via middleware
5. Persistence uses Tauri's plugin-store (JSON, saved to the OS app data directory)

### State management (`lib/store/`)

The Zustand store is composed of four slices:

- `projectSlice` — project CRUD, active project selection
- `componentSlice` — component CRUD, active component selection; `canDeleteComponent()` prevents deletion of components used as instances elsewhere
- `taskSlice` — task CRUD and toggle within a component
- `instanceSlice` — component-instance references (tracking reuse of components)

Auto-save is wired in `lib/projectStore.ts` via `useProjectStore.subscribe()`.

### Data types (`lib/types.ts`)

Key interfaces:
- `Project` → contains an array of `Component`
- `Component` → has `category`, `tasks[]`, `instances[]`, `images[]` (base64-encoded), optional `content` (for `document` category)
- `Task` → has `category: 'frontend' | 'backend' | 'seo' | 'motion'`
- `ComponentImage` → `base64` string + `isPrimary` flag

Legacy field `imageBase64` on `Component` is superseded by `images[]`. Migration runs in `lib/migrations.ts`.

### Routing / navigation

The app has a single Next.js page (`app/page.tsx`) that acts as a client-side router, conditionally rendering:
- `ProjectList` — when no active project
- `ComponentList` — main layout (sidebar + grid or detail panel)
- `ComponentDetail` / `DocumentDetailView` — depending on component category

Navigation state is held in the Zustand store (`activeProjectId`, `activeComponentId`).

### Component structure

```
components/
  ui/              # shadcn/ui primitives (do not edit directly)
  molecules/       # Reusable mid-level components
  forms/           # Controlled form components
  modals/          # Dialog-based creation flows
  *.tsx            # Page-level / feature components
```

All interactive components use `'use client'`. shadcn/ui is configured with the `new-york` style and `lucide` icons.

### Styling

- Tailwind CSS 4 with CSS variables using OKLch color space (defined in `styles/global.css`)
- Light/dark mode variables are defined; use CSS variables (`--color-*`) rather than hardcoded colors
- `cn()` from `lib/utils.ts` combines `clsx` + `tailwind-merge` — use it for conditional class names
