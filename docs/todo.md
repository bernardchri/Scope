# Todo

## Bugs connus
- [ ] Doublons d'ID de composants possibles si deux composants créés au même milliseconde (`component-${Date.now()}`) → passer à `crypto.randomUUID()`

## Composants Document
- [ ] Séparer les `Document` des autres catégories : un `Element` ne peut pas devenir un `Document` et inversement
- [ ] Dans la sidebar, afficher les Documents dans une section séparée en haut

## Informations globales du projet
- [ ] Ajouter le nom du créateur / studio (ex : "Studio Bergall") — utilisé dans le PDF et l'export
- [ ] Ajouter un numéro de version au projet (ex : v1.0) pour le PDF

## Export PDF
- [ ] Page de garde : nom projet, date, version, nom du créateur
- [ ] Tableau récapitulatif : composants × estimation × coût (si taux horaire configuré)
- [ ] Section "Hors périmètre" : lister les tâches marquées `v2`
- [ ] Taux horaire configurable pour calculer les coûts estimés

## Export Devis
- [ ] Export PDF devis commercial : tableau composants × estimation × coût (taux horaire × heures)
- [ ] Total HT + mention TVA
- [ ] Conditions : délais, acompte, hors périmètre
- [ ] Réutilise l'infrastructure `@react-pdf/renderer` existante (nouveau document séparé du cahier des charges)

## Export Story-compiler (STORIES.md)
- [ ] Export global `STORIES.md` (un seul fichier, tous les composants)
- [ ] Export par composant (un fichier `.md` par composant, à placer dans le projet)
- [ ] Format : `# Nom`, `<!-- estimate: Xh -->`, `## Description`, `## Tâches` avec checkboxes
- [ ] Les tâches marquées v2 dans SCOPE → préfixe `v2:` dans le fichier exporté
- [ ] Inclure l'image principale encodée ou référencée

## UX / Navigation
- [ ] Pouvoir modifier le nom du projet (renommage inline + renommage du fichier .scope)
- [ ] Pouvoir réordonner les composants (drag & drop dans la sidebar)
- [ ] Recherche / filtre de composants dans la sidebar
- [ ] Dupliquer un composant existant
- [ ] Enlever dans le header "changer de projet"
- [ ] Ajouter une entrée accueil dans la sidebar, tout en haut avec une icone correspondante

---

## Évaluation effort / priorité

### Gains rapides — faire en premier
| Tâche | Effort | Fichiers |
|---|---|---|
| Bug `crypto.randomUUID()` | Trivial | 1 |
| Recherche/filtre sidebar | Faible | 1 |
| Dupliquer un composant | Faible | 2 |
| Modifier le nom du projet | Moyen | 3 |

### Valeur métier — priorité haute
| Tâche | Effort | Fichiers | Note |
|---|---|---|---|
| Séparer Documents (sidebar + création) | Moyen | 3–4 | Cohérence UX |
| Nom créateur + version projet | Moyen | 3–4 | Requis pour PDF/devis |
| Taux horaire configurable | Moyen | 2–3 | Prérequis devis |
| Export Devis PDF | Moyen | 2–3 | Dépend taux horaire |
| Export STORIES.md | Élevé | 4+ | Feature clé Story-compiler |

### Améliorations secondaires
| Tâche | Effort | Fichiers | Note |
|---|---|---|---|
| Améliorations PDF (page de garde, hors périmètre) | Moyen | 2 | Livrable plus pro |
| Drag & drop composants | Très élevé | 3+ | Confort, pas critique |
