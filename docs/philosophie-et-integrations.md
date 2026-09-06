# Philosophie du projet & intégration Story-compiler

> **Vision élargie** : voir [`vision.md`](./vision.md) — SCOPE comme outil de
> périmètre contractuel versionné (référence signée + brouillon + avenant), les
> 4 publics, les phases. Ce document-ci reste centré sur le pont avec Story-compiler.

SCOPE s'interface avec un autre projet : **[Story-compiler](https://github.com/bernardchri/Story-compiler)**

---

## Workflow global

```
SCOPE                              Story-compiler
─────────────────────────          ──────────────────────────
Phase : Cadrage                    Phase : Développement
Interlocuteur : Client             Interlocuteur : Toi / l'équipe

1. Décrire les composants          1. STORIES.md dans chaque src/
2. Ajouter mockups                 2. story-todo pour tracker
3. Estimer le temps                3. story-compile → README
4. → PDF cahier des charges
5. Client signe / valide
6. → Export STORIES.md ──────────→ début du projet
```

SCOPE protège contre le **scope creep** côté client.
Story-compiler protège contre la **désorganisation** côté dev.

---

## Format de l'export SCOPE → STORIES.md

Pour chaque composant, l'export devrait produire :

```markdown
# Header

<!-- estimate: 3h -->

## Description
Navigation principale avec logo, menu, CTA.

![mockup](mockup-header.png)

## Tâches
- [ ] Intégration HTML/CSS responsive
- [ ] Menu burger mobile
- [ ] Animation ouverture menu
- [ ] v2: Mega menu avec sous-catégories
```

Les tâches SCOPE (front/back/SEO/motion) deviennent des checkboxes.
Les tâches marquées `v2` dans SCOPE deviennent naturellement `v2:` dans Story-compiler.
L'estimation de temps suit avec chaque composant.

---

## Ce qu'il manque à SCOPE pour le cahier des charges PDF

Ce que les clients/agences attendent dans ce type de livrable :

- **Page de garde** — nom projet, date, version, logo client
- **Résumé exécutif** — contexte, objectif, périmètre
- **Liste des composants** avec description + mockup + estimation
- **Tableau récapitulatif** — composants × temps × coût estimé
- **Conditions** — ce qui est hors périmètre (les `v2:`)
- **Signature / validation** — zone client en bas de doc

Le PDF généré par SCOPE doit ressembler à un livrable pro, pas à un export technique.

---

## Prochaines étapes (ordre logique)

1. **Estimations de temps** par composant — ✅
2. **Export PDF** format cahier des charges professionnel (+ page de garde, devis) — ✅
3. **Export STORIES.md** — un fichier par composant ou un fichier global selon la taille — ✅
4. **IDs stables** par composant/tâche dans l'export → prérequis du retour d'avancement
5. **Import d'un `stories-status.json`** produit par Story-compiler → overlay d'avancement dans SCOPE (phase production, voir `vision.md`)

Le pont entre les deux outils est la fonctionnalité clé qui justifie que les deux projets existent et se complètent plutôt que se dupliquent. Aujourd'hui il est **à sens unique** (SCOPE → STORIES.md) ; les étapes 4-5 ouvrent le retour.
