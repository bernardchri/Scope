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
4. Renseigner le nom, le type, cocher les calques enfants à exposer comme
   zones d'intérêt et leur donner un nom.
5. Coller le port et le token (mémorisés ensuite par le plugin).
6. **Envoyer vers SCOPE**.

## Limites connues (phase 3)

- Un seul niveau de calques enfants (pas de zones dans des groupes imbriqués).
- Les zones d'intérêt sont des points (centre du calque), pas des rectangles.
- Pas de re-sync : réenvoyer recrée un import, ne met pas à jour un composant
  existant (voir `docs/figma-import-plan.md`, phase 4).
- `networkAccess.allowedDomains` du manifest autorise uniquement
  `127.0.0.1`/`localhost` — le plugin ne peut pas parler à autre chose.
