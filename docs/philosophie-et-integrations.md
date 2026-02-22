# Philosophie du projet & intégration Story-compiler

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

1. **Ajouter les estimations de temps** dans SCOPE par composant
2. **Améliorer l'export PDF** vers un format cahier des charges professionnel
3. **Ajouter l'export STORIES.md** — un fichier par composant ou un fichier global selon la taille du projet

Le pont entre les deux outils (export STORIES.md) est la fonctionnalité clé qui justifie que les deux projets existent et se complètent plutôt que se dupliquent.
