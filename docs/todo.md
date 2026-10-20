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

## Thèmes (projet « La Vilaine » : thème changeable depuis le backoffice)

Idée (2026-10-20) : l'admin choisit le thème du site dans le backoffice. Un thème = un **mode** d'une collection de variables ; `tokens.css` émet `:root` (mode par défaut) puis `[data-mode="…"] { … }` avec seulement les variables qui changent ; le site pose `data-mode` sur `<html>` (ou sur une section, le sélecteur marche sur n'importe quel élément). Le choix vient d'une option du backoffice (champ « Thème » de type Catégorie dans une collection « Réglages »).

Fait le 2026-10-20 (CRUD, modes sur toute collection, alias éditables) ; le plan complet reste ci-dessous. Figma gratuit n'a qu'un mode par collection : les thèmes se créent donc dans SCOPE.

Ce qui marche déjà : modes de variables → CSS/JSON/Markdown ; création de collections de variables et de modes dans SCOPE (collections manuelles) ; polices et styles de texte globaux.

À faire :
- [x] **CRUD complet des collections de variables** : renommer une collection, renommer / supprimer / choisir le mode par défaut, renommer et changer le type d'une variable, supprimer une collection venue de la source, valeur d'une variable = référence à une autre variable (alias) pour qu'un thème pointe sur les primitives (`--blanc`…)
- [x] **Ajouter des modes à n'importe quelle collection**, y compris celle venue de Figma, sans qu'une synchronisation les écrase
- [ ] **« Entrée unique »** sur une collection de contenu (réglages globaux du site : thème, options) au lieu d'une liste d'entrées
- [ ] **« Collection de thèmes »** : marquer une collection de variables comme thèmes sélectionnables et dire dans l'export quel champ du backoffice choisit le thème + nom de l'attribut (`data-mode` ou `data-theme`)
- [ ] **Polices (et styles de texte) par thème** — seulement si les thèmes changent la typographie, pas seulement les couleurs
- [ ] Document modèle « Thème & backoffice » expliquant le mécanisme à l'IA qui développe

Attention : pour qu'un thème **écrase** les mêmes variables, tous les modes doivent être dans **la même** collection (deux collections qui définissent le même nom de variable sont préfixées `--collection-nom`, donc ne s'écrasent pas). Une collection « Thème » séparée doit donc définir ses propres variables sémantiques (ex. `theme-fond`, `theme-accent`) en alias des primitives, avec un mode par thème.
