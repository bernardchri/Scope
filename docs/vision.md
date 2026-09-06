# Vision — SCOPE

## Positionnement

**SCOPE est l'outil de périmètre contractuel versionné.**

Projets au forfait (freelance, petites agences, sites vitrines conséquents), cycle
en V assumé : le périmètre *est* le contrat. Chaque changement de périmètre est
tracé, chiffré, et fait l'objet d'un « bon pour accord ».

Le concurrent, aujourd'hui : « Word + mails + on espère ». SCOPE remplace ça par un
document toujours à jour de ce sur quoi le client et le studio sont d'accord.

SCOPE **n'est pas** : un outil de suivi de tâches (Linear, Jira), un outil de design
(Figma), ni une plateforme de signature électronique. Il s'interface avec ces
mondes, il ne les remplace pas.

---

## Les 4 publics

| Public | Ce qu'il attend de SCOPE |
|---|---|
| **Client** | Un PDF figé et signé : cahier des charges + devis. « On s'est entendus là-dessus. » |
| **Studio / chef de projet** | La carte vivante du projet, et la capacité d'en émettre des documents (cahier, devis, avenant, STORIES.md). |
| **Graphiste** | Poser la couche *fonctionnelle* sur ses maquettes (il pense aussi les features). Entrée via commentaires / zones sur images. |
| **Développeur** | Le markdown comme source de prompt IA, et que son avancement remonte sans avoir à ouvrir SCOPE. |

---

## Les phases

`Project.phase` pilote ce que l'interface met en avant.

| Phase | SCOPE fait quoi | Documents |
|---|---|---|
| **Cadrage** | Décrire composants, importer maquettes, estimer, chiffrer | Cahier des charges, devis |
| **Production** | Afficher l'avancement (import de statut), gérer les demandes de changement via avenants | Avenants, versions successives |
| **Livré** | Archive : toutes les versions signées consultables | — |

La flexibilité « avant / pendant / après les maquettes » est rendue **explicite**
par la phase, au lieu d'être subie.

---

## Le modèle : référence signée + brouillon + avenant

```
v1.0 (figée, signée) ──────── RÉFÉRENCE CONTRACTUELLE
   │
   │  phase production : on voit l'avancement.
   │  Le brouillon peut diverger (demandes client).
   ▼
brouillon (scope.json, éditable) ──► AVENANT = diff (v1.0 → brouillon)
   │                                  + nouveau montant HT, delta budget
   ▼
v1.1 (figée, signée) ──────── nouvelle référence
```

- **`scope.json`** est toujours le brouillon vivant.
- **Figer une version** = snapshot JSON complet + PDF, immuables, dans
  `versions/v1.0/`, avec métadonnées : date figée, date signée client, date signée
  studio, **montant HT**, **empreinte SHA-256** du JSON figé.
- **État d'une version** : `brouillon → figée → signée studio → signée client → active`.

### Figer une version

Écrit `versions/vX.Y/scope.json` (immuable) + `versions/vX.Y/<slug>-cahier.pdf` +
`versions/vX.Y/<slug>-devis.pdf`. Un panneau « Versions » les liste.

Prérequis technique : **les fichiers de `img/` ne doivent jamais être supprimés ni
écrasés** (le « remplacer une maquette » écrit un nouveau UUID). Un snapshot =
`versions/vX.Y/scope.json` + le dossier `img/` partagé. Si cette garantie ne peut
pas être tenue, copier `img/` dans chaque `versions/vX.Y/`.

### Bon pour accord

Ce n'est **pas** une signature électronique qualifiée — juste un « bon pour
accord » qui a valeur contractuelle pour ce type de projet.

Flux réel (le client n'est pas dans l'app) :

1. SCOPE génère le PDF (signature studio apposée si voulu).
2. Le client signe — impression/scan, **ou** via l'outil e-sign du studio, piloté
   hors SCOPE.
3. Le studio réimporte le PDF signé → attaché à la version, statut « signé client
   le [date] ».

Éléments « numériques » légers, sans tiers :

- **Empreinte SHA-256** du JSON figé, imprimée sur le PDF (`Empreinte : a1b2c3…`) —
  permet de vérifier que le PDF correspond à une base non altérée.
- **Capture de signature studio in-app** (canvas + nom + horodatage) intégrée au PDF.

Pas d'intégration DocuSign / Yousign dans SCOPE.

### L'avenant

Nouveau type de document (comme le devis) :

- Rappel de la version de référence (numéro, date, montant HT).
- Modifications : composants ajoutés / retirés / modifiés, tâches ajoutées /
  retirées / passées en `v2`, avec impact heures et €.
- **Nouveau total HT + delta** (`+1 300 € HT`, ou négatif si le client retire un
  module).
- Conditions modifiées (acompte, délai…).
- Bon pour accord des deux parties.

Le moteur de diff (comparaison de deux snapshots) alimente **à la fois** la vue
« comparer les versions » in-app (vert = ajout, rouge = retrait, ambre =
modification) **et** le PDF d'avenant.

---

## Le retour d'avancement (phase production)

SCOPE **lit** l'état, il ne le pilote pas.

- L'export STORIES.md porte des **IDs stables** par composant et par tâche.
- Story-compiler (ou un fichier maintenu à la main) produit un
  `stories-status.json`.
- SCOPE l'importe → overlay d'avancement par composant (« 3/7 tâches, 40 % »).

SCOPE ne devient pas le tracker : il devient le lecteur de la vérité qui vit
ailleurs (repo, Story-compiler).

---

## Feuille de route (colonne vertébrale)

Voir [`todo.md`](./todo.md) § « Versions & avenants » pour le détail coché.

1. `Project.phase` + dashboard qui s'adapte à la phase.
2. **Figer une version** : snapshot + PDF dans `versions/`, panneau « Versions »,
   empreinte SHA-256.
3. **Moteur de diff** entre brouillon et dernière version figée + vue in-app.
4. **PDF d'avenant** (diff formaté + nouveaux totaux + bon pour accord).
5. **Suivi de signature** par version + attacher le PDF signé + capture signature
   studio.
6. **Import d'un statut d'avancement** (phase production).

Le reste (lien Figma par composant, zones rectangulaires sur maquettes) vient
après cette colonne vertébrale.
