# SCOPE

**Outil de cadrage pour projets web — de la discussion client au cahier des charges signé.**

SCOPE est une application desktop open source qui aide les développeurs et les agences à structurer, chiffrer et documenter leurs projets web avant de commencer à coder. Le tout en local, sans serveur, sans abonnement.

![Capture SCOPE](/public/scope-capture.webp)

![Capture SCOPE 2](/public/scope-capture-2.webp)

---

## Pourquoi SCOPE ?

Avant de démarrer un projet, il faut répondre à une question simple : **qu'est-ce qu'on livre exactement ?**

Sans outil dédié, cette phase de cadrage se passe dans des Google Docs approximatifs, des tableaux Excel bricolés ou des emails à rallonge. SCOPE remplace tout ça par un flux de travail clair :

1. **Décrire** les composants du projet (pages, sections, éléments UI)
2. **Illustrer** avec des mockups annotés (pins numérotés sur les images)
3. **Estimer** le temps par composant et par catégorie (Front, Back, SEO, Motion)
4. **Exporter** un cahier des charges PDF professionnel, prêt à faire signer
5. **Transmettre** un fichier `STORIES.md` à l'équipe de dev pour démarrer sans ambiguïté
6. **Suivre** la production et l'avancée du projet avec [Story-compiler](https://github.com/bernardchri/Story-compiler)

![Qu'est-ce que SCOPE ?](/public/presentation-scope.webp)

---

## Fonctionnalités

- **Projets locaux** — stockés en fichiers `.scope` (JSON), aucune donnée en ligne
- **Composants organisés par catégorie** — Templates, Navigation, Sections, Formulaires, Médias, Documents…
- **Mockups annotés** — ajoutez des images, posez des pins numérotés, liez chaque pin à un élément ou un composant
- **Estimations** — temps par composant, total automatique, taux horaire, budget plafond
- **Export PDF** — cahier des charges A4 avec sommaire, détail des composants, zone de signature
- **Export STORIES.md** — pont vers [Story-compiler](https://github.com/bernardchri/Story-compiler) pour le suivi de développement
- **Documents** — section dédiée pour rédiger les contenus en Markdown (briefs, spécifications, notes)
- **Drag & drop** — réordonner les composants dans la sidebar, réordonner les images

---

## Workflow

```
SCOPE                              Story-compiler
─────────────────────────          ──────────────────────────
Phase : Cadrage                    Phase : Développement
Interlocuteur : Client             Interlocuteur : L'équipe

1. Décrire les composants          1. STORIES.md dans chaque src/
2. Ajouter mockups + pins          2. story-todo pour tracker
3. Estimer le temps                3. story-compile → README
4. Générer le PDF
5. Client signe
6. Export STORIES.md ──────────→  Début du projet
```

SCOPE protège contre le **scope creep** côté client.
Story-compiler protège contre la **désorganisation** côté dev.

---

## Stack

| Couche | Technologie |
|--------|-------------|
| Desktop | Tauri v2 (Rust) |
| Frontend | Next.js 15 + TypeScript (export statique) |
| UI | shadcn/ui + Tailwind CSS 4 |
| State | Zustand |
| Storage | Fichiers `.scope` locaux via Tauri |

Aucun serveur. Aucun compte. Aucune télémétrie.

---

## Installation

### Télécharger l'application

Rendez-vous dans les [Releases](https://github.com/bernardchri/Scope/releases) pour télécharger la dernière version :

- **macOS** (Apple Silicon + Intel) — fichier `.dmg`
- **Windows 10 / 11** — fichier `.exe` (installeur NSIS)

### Compiler depuis les sources

Prérequis : [Node.js 20+](https://nodejs.org), [Rust](https://rustup.rs)

```bash
git clone https://github.com/bernardchri/Scope.git
cd Scope
npm install
npm run tauri        # mode développement
npm run build:tauri  # build production (macOS uniquement en local)
```

Les builds multiplateformes (macOS arm64, macOS x64, Windows x64) sont produits automatiquement via GitHub Actions lors du tag d'une release.

---

## Format de fichier

Les projets sont sauvegardés en JSON dans des fichiers `.scope` que vous contrôlez entièrement. Vous pouvez les versionner, les partager ou les sauvegarder comme n'importe quel fichier.

---

## Contribuer

Les contributions sont les bienvenues. Quelques pistes si vous voulez participer :

- Signaler un bug ou proposer une fonctionnalité via les [Issues](https://github.com/bernardchri/Scope/issues)
- Soumettre une Pull Request (voir [`CLAUDE.md`](./CLAUDE.md) pour l'architecture du projet)
- Consulter la [roadmap](./docs/todo.md) pour les prochaines fonctionnalités

---

## Projets liés

- [Story-compiler](https://github.com/bernardchri/Story-compiler) — outil complémentaire pour le suivi de développement

---

## Licence

[MIT](./LICENSE)
