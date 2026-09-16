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
