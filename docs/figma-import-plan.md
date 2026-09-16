# Plan : Import Figma → Composant SCOPE

## Objectif

Un composant SCOPE (`component`/`template`) peut être lié à un composant Figma. Depuis un plugin
Figma, on nomme le composant + on nomme des calques enfants comme « zones d'intérêt ». On importe
dans SCOPE : l'image du composant + des pins nommés positionnés en %. Si la maquette Figma change,
on repousse la mise à jour (nouvelle image, pins recalculés) sans casser les liens vers les
`Task`/`ComponentInstance` déjà existants.

## 1. Modèle de données (côté SCOPE)

- **`ImagePin`** (`lib/types.ts`) : ajouter `label?: string` — le nom donné au calque dans Figma.
  Non-breaking (champ optionnel), pas de migration nécessaire.
- **`Component`** : ajouter un champ optionnel de liaison, ex.
  `figmaLink?: { fileKey, nodeId, lastSyncAt }`. Sert à savoir « ce composant SCOPE correspond à ce
  node Figma » pour permettre le re-push différentiel.
- **`ComponentImage`** : ajouter `figmaNodeId?: string` (le node de l'image importée, pour la
  remplacer plutôt que dupliquer au re-sync).
- Chaque pin importé a besoin d'un identifiant stable côté Figma (l'`id` du calque enfant) stocké
  quelque part pour le matching au re-sync — un champ interne `figmaLayerId?` sur `ImagePin`, non
  affiché, juste pour le diff.

Impact : `lib/types.ts`, `lib/projectSchema.ts` (Zod). Extension additive uniquement — pas de
refonte du PDF export / markdown export (ils lisent déjà `pins[]`, un `label` en plus ne casse
rien).

## 2. Plugin Figma (nouveau projet, hors repo SCOPE ou sous-dossier `figma-plugin/`)

- Manifest Figma standard + UI en iframe (HTML/JS, pas besoin de framework lourd).
- Sélection d'un composant/frame Figma → l'utilisateur :
  - donne/confirme un nom
  - choisit un type (document/component/template/section) →
    `node.setPluginData('scopeType', ...)`
  - sélectionne des calques enfants un par un → leur donne un nom →
    `layer.setPluginData('scopePinLabel', ...)`
- Bouton « Envoyer vers SCOPE » :
  - `node.exportAsync({ format: 'PNG' })` pour l'image du composant
  - calcule pour chaque calque taggé sa position en % relatif au bounding box du composant parent
    (`(layer.x - parent.x) / parent.width * 100`, idem y) — correspond exactement au système
    `ImagePin.x/y` déjà utilisé par SCOPE
  - POST vers le pont local avec : image base64, nom, type, liste de pins
    `{figmaLayerId, label, x, y}`, `fileKey`/`nodeId` du composant

Le plugin ne peut qu'initier des requêtes sortantes (fetch), pas recevoir de push — c'est toujours
le plugin qui déclenche l'envoi (pas de sync automatique en tâche de fond).

## 3. Pont local (côté Tauri/Rust)

- Nouvelle commande Rust + petit serveur HTTP local (ex. `axum`/`tiny_http`) démarré au lancement
  de l'app, écoute sur `127.0.0.1:PORT` uniquement (jamais `0.0.0.0`).
- Un seul endpoint utile : `POST /import-figma` avec le payload du plugin.
- **Sécurité minimale** : un token généré au démarrage de l'app et affiché/copiable dans SCOPE
  (collé une fois dans le plugin Figma), pour éviter qu'une autre page web locale n'envoie des
  données à l'app. Pas de credentials Figma qui transitent — le plugin a déjà son propre contexte
  d'auth Figma.
- Le frontend Next.js écoute l'import via un event Tauri émis par le serveur Rust (comme
  `menu-open-file` existant) pour afficher une modale « Import Figma reçu — choisir le composant
  cible ou en créer un nouveau ».

## 4. Flow d'import / re-sync côté SCOPE

- **Cible de l'import** : un seul projet SCOPE ouvert à la fois (contrainte existante de l'app) →
  l'import cible toujours le projet actif. Pas de sélecteur de projet à construire, cohérent avec
  l'archi document-centric actuelle.
- **Premier import** : l'utilisateur choisit « nouveau composant » ou un composant existant du
  projet ouvert. Crée/complète le `Component` (category selon le type taggé), sauvegarde l'image
  via `saveImage` (réutilise le pipeline de resize existant), crée les pins avec labels,
  enregistre `figmaLink`.
- **Re-sync** (maquette modifiée dans Figma, on repush) :
  - Matching par `figmaLink.nodeId` déjà stocké → composant cible non ambigu.
  - Nouvelle image remplace l'ancienne (même `filename` ou nouveau + suppression de l'ancienne via
    `deleteImage`).
  - Pins : diff par `figmaLayerId`. Pin existant dont le layer existe encore → position/label mis
    à jour, `pinRef` vers Task/Instance préservé. Layer supprimé côté Figma → pin orphelin
    signalé (pas supprimé automatiquement, pour ne pas casser un lien vers une tâche — confirmation
    utilisateur requise). Nouveau layer taggé → nouveau pin créé.

## 5. Ce qui reste ouvert / à trancher plus tard

- Où stocker le token du pont local (`config.dat`, régénéré à chaque lancement ?).
- Gestion du port si déjà utilisé (retry / port dynamique + affichage dans SCOPE).
- Publier le plugin en privé (organisation) vs usage local en mode dev-plugin Figma (le plus
  simple pour commencer, pas besoin de review Figma).

## Phasage suggéré

1. Modèle de données + UI de « lien Figma » sur un composant (sans plugin, juste préparer le
   terrain).
2. Pont local Tauri + endpoint, testé avec `curl`/Postman (payload simulé).
3. Plugin Figma minimal (tag + export, sans re-sync).
4. Re-sync différentiel.
