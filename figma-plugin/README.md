# SCOPE Import — plugin Figma (dev)

Plugin minimal : tague un composant/frame Figma avec un type SCOPE
(document/composant/template/section), nomme des calques enfants comme
« zones d'intérêt » (futurs pins), exporte une image et pousse le tout vers
le pont HTTP local de l'app SCOPE.

Pas de re-sync ni de matching sur import existant dans cette version — chaque
« Envoyer » crée un nouvel import côté SCOPE (phase 4 du plan gèrera la
réconciliation avec un composant déjà lié).

## Installer en local (dev)

1. Ouvrir l'app Figma desktop (le chargement de plugin par manifest ne
   fonctionne pas dans le navigateur).
2. Menu **Plugins → Development → Import plugin from manifest…**
3. Sélectionner `figma-plugin/manifest.json`.
4. Le plugin apparaît dans **Plugins → Development → SCOPE Import**.

## Utiliser

1. Dans SCOPE, ouvrir **Paramètres** → section « Pont Figma (bêta) » →
   relever le **port** et le **token** affichés (régénérés à chaque lancement
   de l'app SCOPE — l'app doit être ouverte pour que le pont écoute).
2. Dans Figma, sélectionner un composant ou une frame.
3. Lancer le plugin (**Plugins → Development → SCOPE Import**).
4. Renseigner le nom, le type, la légende (ex: « Version desktop » /
   « Version mobile »), cocher les calques enfants à exposer comme zones
   d'intérêt et leur donner un nom. La légende est taguée sur le calque
   Figma lui-même (comme le type) — elle reste attachée à ce bloc précis
   même si tu sélectionnes un autre bloc entre-temps, et un re-sync ne
   l'efface jamais si tu la laisses vide côté Figma (celle déjà présente
   dans SCOPE est conservée).
5. Coller le port et le token (mémorisés ensuite par le plugin).
6. **Envoyer vers SCOPE**.

## Variants de composant

Si tu sélectionnes un état d'un component set Figma (ex: le composant
"Header" avec une propriété de variant valant "Desktop"), le plugin
distingue automatiquement deux niveaux :

- **Composant** (nom, type, description) — partagé entre tous les états,
  tagué sur le component set. Envoyer depuis n'importe quel état retrouve
  et met à jour le même composant SCOPE (matching par `groupNodeId`).
- **État** (légende, image, zones d'intérêt) — propre à l'état sélectionné.
  La légende est pré-remplie automatiquement à partir de la valeur de la
  propriété de variant (ex: "Desktop") si tu ne l'as jamais éditée
  manuellement ; sinon ta légende tagée à la main garde la priorité.

La description Figma du component set (le champ « Description » dans le
panneau Figma) est envoyée comme description globale du composant SCOPE à
chaque envoi (écrase la description SCOPE existante si Figma en fournit une).

## Importer tous les états d'un coup

Sélectionne directement le **component set** (pas un état précis) : le
plugin liste ses états détectés et affiche un bouton « Importer tous les
états » à la place du bouton d'envoi normal. Chaque état part comme un
import distinct vers SCOPE, appliqué automatiquement (sans popup de
confirmation par état — sinon il faudrait valider un par un, ce qui va à
l'encontre de l'intérêt de l'import groupé). Les états partagent tous le
même composant SCOPE cible (retrouvé ou créé une fois, puis mis à jour pour
chaque état suivant).

Les zones d'intérêt et la légende restent propres à chaque état : si tu
veux des pins sur un état précis, tague-les au préalable en sélectionnant
cet état individuellement (flux normal), puis fais l'import groupé depuis
le component set une fois que c'est fait.

## Liaison automatique des composants utilisés sur une page

Quand tu envoies une frame de page (template), le plugin détecte les
instances de composant qu'elle contient — récursivement, sans descendre à
l'intérieur d'une instance trouvée (une icône dans un bouton n'est pas
comptée séparément). Pour chaque composant Figma ainsi détecté, si un
composant SCOPE avec le même lien Figma existe déjà (importé au préalable,
même en un seul état ou tous ses états), un `ComponentInstance` est créé
automatiquement dans le template, sans action manuelle.

- Un composant Figma pas encore importé dans SCOPE est simplement ignoré
  (pas d'import en cascade) — importe-le d'abord (seul ou en bulk), puis
  renvoie la page pour que le lien se fasse.
- Chaque re-sync régénère entièrement les instances auto-créées à partir des
  composants détectés à cet instant (pas de duplication si tu renvoies
  plusieurs fois) — les instances que tu as ajoutées à la main dans SCOPE ne
  sont jamais touchées.
- Cette version ne place pas de pin pour ces instances (positionner
  correctement un pin pour un composant imbriqué à une profondeur
  quelconque demande un calcul de position absolue plus complexe, pas encore
  fait) — juste le lien composant ↔ page. Le placement de pin reste manuel
  pour l'instant (ou via les zones d'intérêt existantes, limitées aux
  calques enfants directs).

## Limites connues (phase 3)

- Un seul niveau de calques enfants (pas de zones dans des groupes imbriqués).
- Les zones d'intérêt sont des points (centre du calque), pas des rectangles.
- Pas de re-sync : réenvoyer recrée un import, ne met pas à jour un composant
  existant (voir `docs/figma-import-plan.md`, phase 4).
- `networkAccess.allowedDomains` doit être présent — un tableau vide `[]` est
  refusé, il faut explicitement `["none"]` pour dire "aucun accès réseau en
  production". L'accès réel se fait entièrement via `devAllowedDomains`
  (dev local uniquement).
- `networkAccess.devAllowedDomains` du manifest liste 5 ports exacts
  (`http://localhost:51789` à `51793`). `devAllowedDomains` (pas
  `allowedDomains`) car c'est la clé prévue par Figma pour l'accès réseau en
  développement local — `allowedDomains` exigerait un champ `reasoning`
  (justification revue lors d'une publication, non pertinent ici). Le
  validateur de manifest Figma refuse par ailleurs les IP littérales
  (`http://127.0.0.1:*`) et le wildcard de port (`http://localhost:*`) — seul
  un port exact est accepté. Le pont côté SCOPE
  (`src-tauri/src/figma_bridge.rs`) essaie ces mêmes ports dans l'ordre et
  prend le premier libre, donc `devAllowedDomains` reste synchronisé avec
  `CANDIDATE_PORTS` côté Rust. Si les 5 ports sont pris (rare : une autre app
  qui les utilise déjà), le pont ne démarre pas et les Paramètres SCOPE
  affichent « Pont indisponible ».
- Si ce plugin est un jour publié, `devAllowedDomains` ne suffira plus (il
  n'est actif qu'en développement local) : il faudra passer par
  `allowedDomains` + `reasoning`.
- **N'utilise jamais le mot "import" dans `code.js`** (variable, commentaire,
  chaîne, route HTTP…). Le sandbox Figma qui exécute le plugin fait une
  détection assez large de tout ce qui ressemble à un `import(...)` dynamique
  (interdit pour raisons de sécurité) et rejette carrément l'exécution du
  plugin avec `SyntaxError: possible import expression rejected` si le mot
  apparaît n'importe où dans le fichier — y compris dans un commentaire.
  C'est pour ça que la route est `/scope-push` et non `/import-figma`. Ça ne
  concerne que `code.js` (le sandbox) : `ui.html` tourne dans un iframe
  navigateur classique, pas soumis à cette contrainte.
