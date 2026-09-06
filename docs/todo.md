# Todo

## Bugs connus

_(aucun bug connu)_


## Versions & avenants — colonne vertébrale

Voir [`vision.md`](./vision.md) pour le modèle complet (référence signée + brouillon + avenant).

- [ ] **1. `Project.phase`** (`cadrage / production / livré`) + dashboard qui s'adapte à la phase
- [ ] **2. Figer une version** : snapshot `versions/vX.Y/scope.json` (immuable) + PDF cahier + PDF devis, métadonnées (dates, montant HT, empreinte SHA-256), panneau « Versions »
- [ ] **3. Moteur de diff** entre le brouillon et la dernière version figée (composants ±, tâches ± / v2, estimations, budget, conditions) + vue « comparer les versions » in-app (vert/rouge/ambre)
- [ ] **4. PDF d'avenant** : rappel version de référence, modifications chiffrées, nouveau total HT + delta, conditions modifiées, bon pour accord
- [ ] **5. Suivi de signature** par version (`brouillon → figée → signée studio → signée client → active`) + réimport du PDF signé + capture signature studio in-app (canvas + nom + horodatage) dans le PDF
- [ ] **6. Import d'un statut d'avancement** (`stories-status.json`) → overlay par composant (x/y tâches, %). Prérequis : IDs stables par composant/tâche dans l'export STORIES.md

**Prérequis transverse** : garantir que les fichiers de `img/` ne sont jamais supprimés ni écrasés (le « remplacer une maquette » écrit un nouveau UUID) — sinon les anciennes versions figées perdent leurs images. ⚠️ contredit « Réduire le projet » ci-dessous.


## Widgets
### Maquettes
- [x] pouvoir modifier une image par une autre

### Commentaire
- [x] création d'un nouveau widget Commentaire

## Export PDF

- [x] Toutes les images sont rendues dans le PDF
- [x] Les images prennent la largeur de la page
- [x] Page de garde : nom projet, date, version, nom du créateur/studio
- [x] Supprimer les estimations de temps du rendu PDF (heures, coûts)
- [x] Section "Hors périmètre" : lister les tâches marquées `v2`

## Export Devis (nouveau document PDF)

- [x] Tableau composants × estimation × coût (taux horaire × heures)
- [x] Conditions : délais, acompte, hors périmètre
- [x] Réutilise l'infrastructure `@react-pdf/renderer` existante

## Export STORIES.md

- [x] Export par composant (un fichier `.md` par composant)
- [x] Tâches marquées v2 → préfixe `v2:` dans l'export

## Informations projet

- [x] Informations client : nom, lien internet, etc.
- [x] Nom du créateur / studio (ex : "Studio Bergall") — utilisé dans PDF et export
- [x] Numéro de version du projet (ex : v1.0) pour le PDF

## Annotations images

Les pins permettent de marquer un point précis sur une maquette. Les **zones** étendent ce concept à des rectangles :

- [ ] Zones rectangulaires : cliquer-glisser sur une image pour dessiner une zone (stockée en `{ x, y, width, height }` en %)
- [ ] Lier une zone à un composant existant du projet (ex : zone "header" → composant "Hero")
- [ ] Affichage : overlay semi-transparent avec le nom du composant lié
- [ ] Cohabitation pins + zones sur la même image (toggle séparé ou mode unique)
- [x] Rendu PDF : zones dessinées sur les images de templates avec légende

## UX / Navigation

- [ ] Recherche / filtre de composants dans la sidebar
- [x] Dupliquer un composant existant
- [x] Recadrage d'image : crop interactif dans l'interface, export du recadrage

## Réglages & préférences

- [x] Menu application pour les options générales
- [ ] Réglages généraux du projet (visibilité taux horaire, etc.)
- [x] Pouvoir masquer certaines informations (taux horaire, etc.) — utile en présentation client

### Snippets
- [ ] Snippets/templates de contenu réutilisables (navigateurs supportés, textes récurrents, todo-listes) — stockés au niveau global de l'app
- [ ] Export/import des préférences et snippets

## Maintenance projet

- [ ] Réduire le projet : compresser les images de `img/`. ⚠️ **ne pas supprimer** les fichiers non référencés tant que le versioning (§ Versions & avenants) n'a pas tranché la question de l'immuabilité des snapshots — une image « orpheline » dans le brouillon peut encore être référencée par une version figée.

## Documents & fichiers

- [ ] Importer d'autres types de documents (Excel, PDF, etc.) et les lier au projet — stockés dans un dossier `documents/`

## Qualité / dette technique

- [x] Valider `scope.json` au chargement (schéma Zod) pour se prémunir des fichiers corrompus ou d'une version future
- [ ] Étendre la couverture de tests (`npm test`) : `markdownExport`, slices du store, helpers de crop
- [ ] Réduire les ~23 warnings ESLint restants (`<img>` → next/image, deps de hooks, vars inutilisées)
