# Personas et flux

Cinq profils parcourent la chaîne de valeur de SCOPE. Ils servent à auditer le flux : pour chaque changement, se demander ce que chacun produit, ce qu'il reçoit, et où l'information se perd ou se déforme.

```
Créatif (Figma + plugin) → SCOPE (chef de projet complète) → exports
                                                              ├─ Markdown : développeur, IA Claude
                                                              └─ PDF / devis : client
```

## Créatif

Designer. Travaille dans Figma et utilise le plugin `scope-figma-plugin` pour pousser frames et composants vers SCOPE et tenir la doc à jour.

- **Gestes** : taguer le type, nommer des groupes `groupe/état` (`home-ui/desktop`, `home-ui/mobile`), cocher les composants (pins), cocher « exporter » sur les SVG, envoyer (avec ou sans cascade des composants cochés), « Importer tous les états ».
- **Attend** : que le re-sync ne détruise pas le travail fait dans SCOPE (type, nom, description conservés), un retour clair du plugin (« Exports détectés », message d'envoi), peu de manipulations.
- **Frictions à surveiller** : ne pas savoir ce qui est marqué ou envoyé, SCOPE fermé ou token changé à chaque lancement, composants de bibliothèque non chargés, calques dans une instance ignorés.

## Chef de projet

Travaille dans l'app SCOPE, pas dans Figma. Complète ce que les maquettes ne disent pas : fonctionnel, spécificités techniques, tâches (frontend, backend, seo, motion), estimations, notes, liens entre composants (blocs « Composants utilisés », pins).

- **Attend** : que les blocs utiles soient visibles (un bloc dont les données existent est affiché même s'il n'est pas dans la fiche), que ses modifications survivent aux re-syncs Figma, que le tableau de bord (statistiques, ressources) donne la vue d'ensemble.
- **Frictions à surveiller** : import qui écrase ses modifications, pins orphelins après un re-sync, composants Figma absents de SCOPE (pin sans instance), doublons d'instances.

## Développeur

Ne vit pas dans SCOPE. Consomme l'export Markdown (`stories-img/`, `stories-svg/<composant>/`, fichier unique ou multi-fichiers avec `index.md`) et les SVG téléchargés depuis le bloc « Ressources ».

- **Attend** : des fichiers autonomes aux noms lisibles, les pins légendés, les tâches par catégorie, les composants utilisés explicites, des SVG prêts à l'emploi, un lien vers la source Figma.
- **Frictions à surveiller** : liens relatifs cassés, collisions de noms de fichiers, image avec pins incrustés ou image brute, absence de lien Figma dans l'export, hiérarchie des composants imbriqués peu lisible.

## IA Claude

Lit l'export Markdown (pas l'app) pour créer les composants de code et assister le développeur. Lecteur littéral, sans contexte implicite, qui ne voit pas les images à moins qu'elles soient référencées.

- **Attend** : un Markdown structuré et non ambigu (titres stables, une section par composant, hiérarchie des composants utilisés, tâches cochables, légende des pins, SVG référencés par chemin relatif, description fonctionnelle et contraintes techniques), des identifiants ou liens Figma pour retrouver la source.
- **Frictions à surveiller** : informations seulement visuelles (pins incrustés sans équivalent texte), noms de composants dupliqués, SVG sans contexte d'usage, estimations et commentaires mélangés au contenu, absence de conventions (props, états desktop/mobile).

## Client

Non technique. Lit le PDF et le devis pour valider le périmètre. Ne voit ni Figma ni l'app.

- **Attend** : une page de garde claire (nom, version, client), des maquettes lisibles avec pins numérotés et légendes compréhensibles, un langage non technique, des estimations et un devis cohérents avec la doc.
- **Frictions à surveiller** : jargon et tâches techniques exposés, pins sans légende parlante, détails d'implémentation hors sujet, blocs affichés qui n'ont pas de sens pour un lecteur externe, incohérence entre PDF et Markdown.

## Constats de l'audit

Audit du 2026-10-19, par lecture du code (plugin, import, export Markdown, PDF). Aucun correctif appliqué à ce stade. Classés par impact.

| # | Constat | Personas touchés | Impact |
|---|---|---|---|
| 1 | L'export Markdown n'a pas de section « Composants utilisés ». Les instances n'apparaissent que dans la légende des pins (`composant : X`, sans lien) ; une instance sans pin disparaît. L'arbre Home → Header → Logo, construit par l'import en cascade, n'est donc pas lisible. | Développeur, IA Claude | Élevé |
| 2 | La légende des pins ignore `pin.label` : un pin non relié à un composant SCOPE s'affiche « Pin #3 » sans nom. | Développeur, IA Claude | Élevé, correctif simple |
| 3 | Aucun retour dans SCOPE après un import groupé ou en cascade : pas de récapitulatif de ce qui a été créé, mis à jour, ni des pins orphelins. On croit que « rien ne s'est passé ». | Créatif, chef de projet | Élevé |
| 4 | Deux composants de même nom écrasent leurs images (`<slug>-<i>.png`) et partagent le dossier `stories-svg/<slug>/` à l'export. | Développeur, IA Claude | Moyen, correctif simple |
| 5 | Quand une image a des pins, seule la version avec pins incrustés est exportée : plus d'image propre pour mesurer ou analyser. | Développeur, IA Claude | Moyen |
| 6 | Le Markdown ne contient pas le lien Figma (`fileKey`, `groupNodeId`) : impossible de retrouver la source d'un composant. | Développeur, IA Claude | Moyen |
| 7 | Les pins orphelins ne sont jamais revus lors d'un envoi groupé (les `bulk` sont appliqués sans confirmation) : ils s'accumulent. | Chef de projet | Moyen |
| 8 | Le token du pont est régénéré à chaque lancement de SCOPE : il faut le recoller dans le plugin. Un 404 ou un 401 ne dit pas quoi faire. | Créatif | Moyen |
| 9 | Nom et description ne sont plus jamais resynchronisés depuis Figma (effet de bord de la protection des modifications faites dans SCOPE). Un renommage dans Figma n'arrive jamais. | Créatif, chef de projet | À arbitrer |
| 10 | Ressources : jamais retirées quand on décoche « exporter », pas d'ajout manuel, aucune information d'usage (où le SVG sert). | Chef de projet, IA Claude | Faible |
| 11 | PDF client : catégories de tâches techniques (Frontend, Backend, SEO, Motion) et bloc « Composants utilisés » exposés tels quels. | Client | Faible |
| 12 | Un type tagué une fois dans Figma écrase pour toujours le type choisi dans SCOPE. | Créatif, chef de projet | Faible |

Traités le 2026-10-19 : 1 (section « Composants utilisés » dans le Markdown, liens entre fiches en multi-fichiers), 2 (légende des pins avec nom, type, spécifications, composant, tâche), 4 (slugs uniques), 5 (image sans pins exportée à côté de l'image annotée), 6 (ligne « Source Figma »). Ajouts : types de pin avec spécifications (`lib/pinKinds.ts`), pins ajoutés dans SCOPE conservés au re-sync, consignes de lecture en tête de l'export.

Points déjà corrects : le PDF affiche le nom du composant lié à côté de chaque pin ; les blocs dont les données existent sont forcés à l'affichage ; type, nom et description SCOPE sont protégés contre les imports.

## Repasse du 2026-10-19 (après collections, types de pin, synchro)

Audit par lecture du code et d'un export Markdown généré sur un projet d'essai (liste, répéteur, relation cassée, pin vide). Classés par impact.

| # | Constat | Personas touchés | Impact |
|---|---|---|---|
| R1 | Rien ne signale les pins à qualifier : un pin sans type ni précision sort « Pin #5 » dans l'export, sans « à préciser ». Aucune vue d'ensemble (combien de pins qualifiés ?). | Chef de projet, IA Claude | Élevé |
| R2 | Incohérences silencieuses dans le modèle de contenu : relation sans collection cible (« collection non choisie » exporté tel quel), pin Liste dont la collection a été supprimée (le lien disparaît, l'export dit juste « Liste »), champ sans nom, collection jamais utilisée. | Chef de projet, développeur, IA Claude | Élevé |
| R3 | PDF client : « Éléments repérés » expose le jargon (max 128 caractères, SEO : H2, éditable en backoffice, champ de collection) et la page « Modèle de contenu » montre les identifiants techniques. S'ajoute au constat 11 (catégories de tâches techniques). | Client | Élevé |
| R4 | Markdown : « collection « Projets » » dans un pin n'est pas un lien vers le modèle de contenu ; en multi-fichiers, les fiches ne renvoient pas à `index.md`. Les relations ne sont visibles que dans un sens (pas de « référencée par »). | Développeur, IA Claude | Moyen |
| R5 | Changer le type d'un pin efface ses spécifications et ses liens (collection, champ) sans confirmation. | Chef de projet | Moyen |
| R6 | L'éditeur de pin est absent du zoom plein écran (ZoomModal) : il faut fermer le zoom pour qualifier un pin. | Chef de projet | Moyen |
| R7 | Toujours ouverts : token régénéré à chaque lancement et erreurs 404/401 sans consigne (8), pas de récapitulatif d'un envoi groupé hors différences de champs (3), pins orphelins jamais revus en envoi groupé (7). | Créatif, chef de projet | Moyen |
| R8 | Les collections n'apparaissent ni dans les statistiques du tableau de bord ni dans la vue d'ensemble. | Chef de projet | Faible |

Points validés : liaison pin → collection / champ / composant de ligne de répéteur exportée en Markdown et en PDF ; client, version et heures dans l'en-tête Markdown ; synchro champ par champ à l'envoi.
