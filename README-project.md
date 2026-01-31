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