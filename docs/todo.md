# Todo

## Bugs connus

_(aucun bug connu)_


## Widgets
### Maquettes
- [x] pouvoir modifier une image par une autre

### Commentaire
- [x] création d'un nouveau widget Commentaire

## Export PDF

- [x] Toutes les images sont rendues dans le PDF
- [x] Les images prennent la largeur de la page
- [ ] Page de garde : nom projet, date, version, nom du créateur/studio
- [x] Supprimer les estimations de temps du rendu PDF (heures, coûts)
- [ ] Section "Hors périmètre" : lister les tâches marquées `v2`

## Export Devis (nouveau document PDF)

- [x] Tableau composants × estimation × coût (taux horaire × heures)
- [ ] Conditions : délais, acompte, hors périmètre
- [x] Réutilise l'infrastructure `@react-pdf/renderer` existante

## Export STORIES.md

- [x] Export par composant (un fichier `.md` par composant)
- [x] Tâches marquées v2 → préfixe `v2:` dans l'export

## Informations projet

- [ ] Informations client : nom, lien internet, etc.
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

- [ ] Réduire le projet : fonction qui supprime les fichiers `img/` non référencés par un composant et compresse les images restantes — permet de nettoyer l'espace disque sans supprimer manuellement

## Documents & fichiers

- [ ] Importer d'autres types de documents (Excel, PDF, etc.) et les lier au projet — stockés dans un dossier `documents/`

## Qualité / dette technique

- [ ] Valider `scope.json` au chargement (schéma Zod) pour se prémunir des fichiers corrompus ou d'une version future
- [ ] Étendre la couverture de tests (`npm test`) : `markdownExport`, slices du store, helpers de crop
- [ ] Réduire les 25 warnings ESLint restants (`<img>` → next/image, deps de hooks, vars inutilisées)
