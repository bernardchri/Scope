# SCOPE

Outil desktop pour structurer techniquement des projets web (WordPress / composants / tâches).

## Objectif

Organiser et décomposer un projet web en composants réutilisables, associer des tâches par catégorie (front-end, back-end, SEO, motion), visualiser l'avancement et générer un cahier des charges.

## Stack

- **Frontend** : Next.js + TypeScript (export statique)
- **Desktop** : Tauri v2
- **UI** : shadcn/ui + Tailwind CSS
- **State** : Zustand
- **Storage** : tauri-plugin-store (local, aucun serveur)

## Démarrage

```bash
npm run dev          # Next.js sur http://localhost:3000
npm run tauri        # Application desktop (dev)
npm run build:tauri  # Build production
```

## Documentation

- [`docs/philosophie-et-integrations.md`](./docs/philosophie-et-integrations.md) — Workflow SCOPE → Story-compiler
- [`docs/SCOPE-PROJECT-RECAP.md`](./docs/SCOPE-PROJECT-RECAP.md) — Récap technique complet
- [`docs/README-project.md`](./docs/README-project.md) — Roadmap et améliorations
- [`CLAUDE.md`](./CLAUDE.md) — Guidance pour Claude Code
