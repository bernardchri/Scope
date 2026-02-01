# Scope
Outil desktop pour structurer techniquement des projets web (WordPress / composants / champs).


## 🎯 Objectif
Permettre d'organiser mon travail dans la création d'une application, d'un site internet ou tout autre projet.

## ✅ MVP – Fonctionnalités
- Créer des projets
- Découper un projet en composants
- Associer des tâches à chaque composant
- Lister les champs CMS nécessaires
- Voir ce qui est fait / manquant
- Données persistantes en local

## ❌ Hors scope (volontairement)
- Pas de collaboration
- Pas de cloud
- Pas d’authentification
- Pas d’export automatique WordPress
- Pas de vues graphiques complexes

## Stack
- Frontend : Next.js
- Desktop : Tauri
- UI : shadcn/ui, tailwind.css
- State : Zustand
- Storage : tauri-plugin-store (local)



```
    {
    "project": "Project scope",
    "stack": {
        "frontend": "Next.js",
        "desktop": "Tauri",
        "ui" : "shadcn/ui",
        "storage": "tauri-plugin-store",
        "state": "Zustand"
    },
    "rules": [
        "Sessions de 30 à 45 minutes maximum",
        "Pas d'optimisation prématurée",
        "UI moche acceptée",
        "Fonctionnel > élégant"
    ],
    "phases": [
        {
        "phase": "S0 - Préparation mentale",
        "sessions": [
            {
            "id": "S0.1",
            "goal": "Créer le repo et écrire le README avec l'objectif du logiciel",
            "output": "README.md avec vision simple du MVP"
            }
        ]
        },
        {
        "phase": "S1 - Setup Tauri + Next",
        "sessions": [
            {
            "id": "S1.1",
            "goal": "Initialiser le projet Next.js",
            "output": "App Next qui tourne en web"
            },
            {
            "id": "S1.2",
            "goal": "Ajouter Tauri au projet",
            "output": "Application desktop qui s'ouvre"
            },
            {
            "id": "S1.3",
            "goal": "Nettoyage du boilerplate",
            "output": "Projet minimal sans code inutile"
            }
        ]
        },
        {
        "phase": "S2 - Persistance (blocage principal)",
        "sessions": [
            {
            "id": "S2.1",
            "goal": "Installer tauri-plugin-store",
            "output": "Plugin fonctionnel"
            },
            {
            "id": "S2.2",
            "goal": "Créer un store local (.dat)",
            "output": "Fichier persisté sur le disque"
            },
            {
            "id": "S2.3",
            "goal": "Tester set / get / save",
            "output": "Valeur persistante après redémarrage"
            }
        ]
        },
        {
        "phase": "S3 - Modèle de données",
        "sessions": [
            {
            "id": "S3.1",
            "goal": "Définir types Project / Component / Task / Field",
            "output": "types.ts validé"
            },
            {
            "id": "S3.2",
            "goal": "Créer un faux projet en JSON",
            "output": "mockData.ts cohérent"
            }
        ]
        },
        {
        "phase": "S4 - State global + sync store",
        "sessions": [
            {
            "id": "S4.1",
            "goal": "Installer et configurer Zustand",
            "output": "Store global fonctionnel"
            },
            {
            "id": "S4.2",
            "goal": "Charger les projets depuis le store au démarrage",
            "output": "Hydratation correcte"
            },
            {
            "id": "S4.3",
            "goal": "Synchroniser chaque mutation avec le store Tauri",
            "output": "CRUD persistant réel"
            }
        ]
        },
        {
        "phase": "S5 - CRUD Projets",
        "sessions": [
            {
            "id": "S5.1",
            "goal": "Afficher la liste des projets",
            "output": "Vue liste simple"
            },
            {
            "id": "S5.2",
            "goal": "Créer un projet",
            "output": "Ajout + persistance"
            },
            {
            "id": "S5.3",
            "goal": "Supprimer / renommer un projet",
            "output": "CRUD complet projets"
            }
        ]
        },
        {
        "phase": "S6 - CRUD Composants",
        "sessions": [
            {
            "id": "S6.1",
            "goal": "Sélection d’un projet actif",
            "output": "Navigation projet → composants"
            },
            {
            "id": "S6.2",
            "goal": "Ajouter / supprimer un composant",
            "output": "Composants persistants"
            }
        ]
        },
        {
        "phase": "S7 - Tâches et champs",
        "sessions": [
            {
            "id": "S7.1",
            "goal": "CRUD tâches pour un composant",
            "output": "Checklist fonctionnelle"
            },
            {
            "id": "S7.2",
            "goal": "CRUD champs CMS",
            "output": "Champs liés au composant"
            }
        ]
        },
        {
        "phase": "S8 - Liens tâches ↔ champs",
        "sessions": [
            {
            "id": "S8.1",
            "goal": "Associer une tâche à un ou plusieurs champs",
            "output": "Lien logique stocké"
            },
            {
            "id": "S8.2",
            "goal": "Afficher l’état champ manquant / lié",
            "output": "Feedback utile"
            }
        ]
        },
        {
        "phase": "S9 - Lisibilité",
        "sessions": [
            {
            "id": "S9.1",
            "goal": "Ajouter badges et compteurs",
            "output": "Lecture rapide de l’état du projet"
            }
        ]
        },
        {
        "phase": "S10 - Validation terrain",
        "sessions": [
            {
            "id": "S10.1",
            "goal": "Utiliser l’outil sur un vrai projet WordPress",
            "output": "Liste d’améliorations réelles"
            }
        ]
        }
    ]
    }
```


---

## améliorations

### global
- [ ]  dev : Refactorisation des éléments 
- [ ] ui : Installation et utilisation de shadcn/ui 
- [ ] v2 ux : ajouter des options globales à scope
- [ ] v2 ux: j'aimerai améliorer visuellement l'ensemble. Au clic sur le projet, avoir la liste des composants dans un panneau à gauche, et les détails dans un panneau à droite. Dans ce panneau de droite avoir l'image de référence et 
- [ ] Faire un export global de tout le projet sous forme de markdown

## Projet liste
- [ ] ux : Mettre une alerte avant de supprimer du contenu

## Composant list
- [ ] ux : possibilité de trier en drag-and-drop l'ordre des composants
- [ ] v2 : ux : possibilté de trier l'ordre des composants : trie par categorie, par taches à accomplir 
- [ ] ux : Mettre une alerte avant de supprimer un composant


## Composant detail 

### Les todolists
- [X] dev : Ajouter une catégorie : "front-end", "back-end","seo","motion". (par défaut front-end)
- [ ] ux : A la création d'une nouvelle tache avoir un select à gauche du champ de nom
- [ ] ux : Afficher la catégorie avant le nom de la tache. 
- [ ] ux : Avoir la possibilité de modifier une tache
- [ ] ux : Bouton ajouter une nouvelle tache 
- [ ] ui : Visuellement gagner de la Par défaut ne pas relier directement à champ pour
- [ ] ux : améliorer la manière dont on crée les nouvelle tâche, l'idéal serait de ne pas avoir à toucher la souris à la création de plusieurs todo. un champ texte en dessous de la liste, Entrée pour valider, on rentre dans de nouveau dans ce champs

### Champs CMS
- [X] suppression de la notion de champs pour mettre dans la todo des categories


### Composants utilisés
- [ ] ux : possibilité de changer l'ordre de la liste en drag and drop

## Liste des composants
- [ ] ux: ajouter la possibilité de dupliquer un composants afficher le select à gauche du champ nom 
- 