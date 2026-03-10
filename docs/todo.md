# Todo

## Bugs connus

_(aucun bug connu)_

## Export PDF

- [ ] Toutes les images sont rendues dans le PDF
- [ ] Les images prennent la largeur de la page
- [ ] Page de garde : nom projet, date, version, nom du créateur/studio
- [ ] Supprimer les estimations de temps du rendu PDF (heures, coûts)
- [ ] Section "Hors périmètre" : lister les tâches marquées `v2`

## Export Devis (nouveau document PDF)

- [ ] Tableau composants × estimation × coût (taux horaire × heures)
- [ ] Total HT + mention TVA
- [ ] Conditions : délais, acompte, hors périmètre
- [ ] Réutilise l'infrastructure `@react-pdf/renderer` existante

## Export STORIES.md

- [ ] En-tête d'export : nombre d'éléments, composants, heures estimées
- [ ] Export par composant (un fichier `.md` par composant)
- [ ] Tâches marquées v2 → préfixe `v2:` dans l'export

## Informations projet

- [ ] Nom du créateur / studio (ex : "Studio Bergall") — utilisé dans PDF et export
- [ ] Numéro de version du projet (ex : v1.0) pour le PDF
- [ ] Total HT affiché
- [ ] Informations client : nom, lien internet, etc.

## Annotations images

Les pins permettent de marquer un point précis sur une maquette. Les **zones** étendent ce concept à des rectangles :

- [ ] Zones rectangulaires : cliquer-glisser sur une image pour dessiner une zone (stockée en `{ x, y, width, height }` en %)
- [ ] Lier une zone à un composant existant du projet (ex : zone "header" → composant "Hero")
- [ ] Affichage : overlay semi-transparent avec le nom du composant lié
- [ ] Rendu PDF : zones dessinées sur les images de templates avec légende
- [ ] Cohabitation pins + zones sur la même image (toggle séparé ou mode unique)

## UX / Navigation

- [ ] Recherche / filtre de composants dans la sidebar
- [ ] Dupliquer un composant existant
- [x] Recadrage d'image : crop interactif dans l'interface, export du recadrage

## Réglages & préférences

- [ ] Menu application pour les options générales
- [ ] Réglages généraux du projet (visibilité taux horaire, etc.)
- [ ] Pouvoir masquer certaines informations (taux horaire, etc.) — utile en présentation client
- [ ] Snippets/templates de contenu réutilisables (navigateurs supportés, textes récurrents, todo-listes) — stockés au niveau global de l'app
- [ ] Export/import des préférences et snippets

## Maintenance projet

- [ ] Réduire le projet : fonction qui supprime les fichiers `img/` non référencés par un composant et compresse les images restantes — permet de nettoyer l'espace disque sans supprimer manuellement

## Documents & fichiers

- [ ] Importer d'autres types de documents (Excel, PDF, etc.) et les lier au projet — stockés dans un dossier `documents/`


## estimation claude très rapide
Tâche: Supprimer estimations du PDF
  Effort: ~20 lignes
  Fichiers touchés: 1 (ProjectPDFDocument.tsx)
  Note: Juste retirer des blocs
  ────────────────────────────────────────
  Tâche: Images pleine largeur PDF
  Effort: ~10 lignes
  Fichiers touchés: 1 (ProjectPDFDocument.tsx)
  Note: Ajuster les styles
  ────────────────────────────────────────
  Tâche: Toutes les images dans le PDF
  Effort: ~40 lignes
  Fichiers touchés: 1-2 (ProjectPDFDocument.tsx,
    pdfExport.tsx)
  Note: Boucle sur images[] au lieu de la primary
  ────────────────────────────────────────
  Tâche: Dupliquer un composant
  Effort: ~30 lignes
  Fichiers touchés: 2 (componentSlice.ts, ComponentList.tsx)
  Note: Deep clone + nouveau UUID
  ────────────────────────────────────────
  Tâche: Recherche sidebar
  Effort: ~40 lignes
  Fichiers touchés: 1 (ComponentList.tsx)
  Note: Input + filter sur le state
  ────────────────────────────────────────
  Tâche: Infos projet (créateur, version, client)
  Effort: ~100 lignes
  Fichiers touchés: 3-4 (types, store, dashboard, PDF)
  Note: Nouveaux champs + UI
  ────────────────────────────────────────
  Tâche: Total HT affiché
  Effort: ~20 lignes
  Fichiers touchés: 1 (ProjectDashboard.tsx)
  Note: Calcul déjà dispo
  ────────────────────────────────────────
  Tâche: Page de garde PDF
  Effort: ~80 lignes
  Fichiers touchés: 1-2 (ProjectPDFDocument.tsx)
  Note: Nouveau <Page>, dépend des infos projet
  ────────────────────────────────────────
  Tâche: Masquer taux horaire
  Effort: ~30 lignes
  Fichiers touchés: 2-3 (settings, dashboard, PDF)
  Note: Toggle booléen
  ────────────────────────────────────────
  Tâche: En-tête STORIES.md
  Effort: ~20 lignes
  Fichiers touchés: 1 (markdownExport.ts)
  Note: Texte en haut du fichier
  ────────────────────────────────────────
  Tâche: Export STORIES par composant
  Effort: ~60 lignes
  Fichiers touchés: 1-2 (markdownExport.ts)
  Note: Boucle + écriture multiple
  ────────────────────────────────────────
  Tâche: Tâches v2 dans exports
  Effort: ~40 lignes
  Fichiers touchés: 2 (types + exports)
  Note: Nouveau champ Task.version + filtrage
  ────────────────────────────────────────
  Tâche: Section hors périmètre PDF
  Effort: ~50 lignes
  Fichiers touchés: 1 (ProjectPDFDocument.tsx)
  Note: Dépend du flag v2
  ────────────────────────────────────────
  Tâche: Recadrage d'image
  Effort: ~300 lignes
  Fichiers touchés: 3-4 (nouveau composant crop,
  imageManager,
    viewer)
  Note: Canvas crop + UI modale, le plus gros UX
  ────────────────────────────────────────
  Tâche: Zones rectangulaires
  Effort: ~250 lignes
  Fichiers touchés: 3-4 (types, ImagePinViewer, overlay,
    store)
  Note: Extension du système pins
  ────────────────────────────────────────
  Tâche: Lier zones → composants
  Effort: ~80 lignes
  Fichiers touchés: 2-3 (types, UI select, overlay)
  Note: Dépend des zones
  ────────────────────────────────────────
  Tâche: Zones dans le PDF
  Effort: ~60 lignes
  Fichiers touchés: 2 (imageHelpers.ts, pdfExport.tsx)
  Note: Canvas rendering
  ────────────────────────────────────────
  Tâche: Export devis PDF
  Effort: ~200 lignes
  Fichiers touchés: 2-3 (nouveau document PDF, types)
  Note: Dépend infos projet
  ────────────────────────────────────────
  Tâche: Snippets/templates
  Effort: ~300 lignes
  Fichiers touchés: 4-5 (store global, Rust, UI settings,
    widget)
  Note: Nouveau système complet
  ────────────────────────────────────────
  Tâche: Import documents externes
  Effort: ~200 lignes
  Fichiers touchés: 3-4 (Rust, types, UI, dossier documents/)
  Note: Nouveau flux d'import
  ────────────────────────────────────────
  Tâche: Menu app + réglages
  Effort: ~150 lignes
  Fichiers touchés: 3-4 (Rust menu, settings store, UI
  modale)
  Note: Infrastructure

  Par priorité (rapport valeur/effort) :

  1. Quick wins (~20 min chacun) : supprimer estimations PDF,
   images pleine largeur PDF, total HT, en-tête STORIES
  2. Gains rapides (~1h) : dupliquer composant, recherche
  sidebar, toutes les images dans PDF
  3. Valeur métier (~2-3h) : infos projet + page de garde
  PDF, zones sur images, export devis
  4. Features lourdes (~4h+) : recadrage image, snippets,
  import documents externes


## Import d'image
