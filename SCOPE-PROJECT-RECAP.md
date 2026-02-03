# SCOPE - Application de gestion de projets WordPress

## 📋 Vue d'ensemble

**SCOPE** est une application desktop (Tauri + Next.js) conçue pour gérer et organiser les composants de projets WordPress de manière structurée et visuelle.

---

## 🎯 Objectif

Fournir un outil de gestion de projet qui permet de :
- **Décomposer** un projet WordPress en composants réutilisables
- **Organiser** les tâches par catégorie (Front-end, Back-end, SEO, Motion)
- **Visualiser** la structure complète du projet
- **Tracker** l'avancement avec des composants, tâches et instances

---

## 💡 Intérêt

### Problème résolu
Quand on développe un site WordPress, on a souvent :
- Des dizaines de composants à créer (Header, Footer, Hero, Boutons, etc.)
- Des tâches dispersées entre front-end, back-end, SEO, animations
- Des composants réutilisés à plusieurs endroits (ex: un bouton dans Hero, Footer, Section 2)
- Besoin de suivre l'avancement global du projet

**SCOPE** centralise tout ça dans une interface claire et intuitive.

### Cas d'usage concret
**Projet :** Site vitrine pour une menuiserie

**Structure :**
```
Projet: Site Menuiserie
├── Page Accueil (Template)
│   ├── Header (Section)
│   │   ├── Logo (Element)
│   │   └── Menu (Navigation) ×1
│   ├── Hero (Section)
│   │   ├── Titre (Element) ×1
│   │   ├── Bouton CTA (Element) ×2
│   │   └── Image hero (Media) ×1
│   ├── Section Garanties (Section)
│   │   └── Bouton CTA (Element) ×1
│   └── Footer (Section)
│       └── Bouton CTA (Element) ×2
└── Page Contact (Template)
    ├── Header (Section) ×1
    └── Footer (Section) ×1
```

**Bénéfices :**
- ✅ Vision claire de tous les composants du projet
- ✅ Suivi des tâches par catégorie (6 front-end, 3 back-end, 1 SEO)
- ✅ Réutilisation évidente (Bouton CTA utilisé 5× dans le projet)
- ✅ Attachement d'images de référence pour chaque composant
- ✅ Progression visuelle (12/18 tâches terminées)

---

## 🏗️ Architecture technique

### Stack
- **Frontend :** Next.js 16 + React + TypeScript
- **Desktop :** Tauri v2 (Rust)
- **UI :** shadcn/ui (composants accessibles)
- **State :** Zustand (state management)
- **Persistence :** tauri-plugin-store (stockage local)
- **Styling :** Tailwind CSS
- **Drag & Drop :** @dnd-kit

### Structure de données

```typescript
Project
├── id: string
├── name: string
├── components: Component[]
└── createdAt: string

Component
├── id: string
├── name: string
├── description?: string
├── category: ComponentCategory (template|section|composition|element|navigation|media|form|content)
├── imageBase64?: string (image de référence)
├── instances: ComponentInstance[] (composants utilisés dans celui-ci)
└── tasks: Task[]

Task
├── id: string
├── name: string
├── completed: boolean
└── category: TaskCategory (frontend|backend|seo|motion)

ComponentInstance
├── id: string (instance unique)
└── componentId: string (référence au composant)
```

---

## ✨ Fonctionnalités principales

### 1. Gestion de projets
- Créer/Renommer/Supprimer des projets
- Vue d'ensemble avec statistiques (composants, tâches, progression)
- Navigation par projet

### 2. Gestion de composants
- **Sidebar catégorisée** : Composants groupés par type (Template, Section, Element, etc.)
- **Catégories repliables** pour une navigation claire
- **Création rapide** avec nom, description, catégorie, image
- **Édition inline** de tous les champs
- **Images de référence** (base64, max 1MB) pour visualiser le composant
- **Suppression protégée** : impossible de supprimer un composant utilisé ailleurs

### 3. Gestion de tâches (UX optimisée)
- **Input persistant** en bas de liste pour ajout rapide
- **Création ultra-rapide** : tape + Enter + enchaîne
- **Catégories visuelles** : Front-end, Back-end, SEO, Motion (badges colorés)
- **Sélection rapide** : clic sur badge pour changer de catégorie
- **Drag & Drop** : réorganiser les tâches à la souris
- **Édition inline** : double-clic sur le nom
- **Actions au hover** : icônes éditer/supprimer apparaissent au survol
- **Compteur de progression** : X/Y tâches complétées
- **Checkbox** pour marquer comme terminé

### 4. Réutilisation de composants (instances)
- **Système d'instances** : Ajouter plusieurs fois le même composant
- **Exemple :** Bouton CTA utilisé 3× dans Hero, 2× dans Footer
- **Navigation fluide** : Clic sur instance → Détail du composant
- **Compteur d'usage** : "Utilisé 5× dans le projet"
- **Protection** : Impossible de supprimer un composant utilisé

### 5. Interface et UX
- **Layout à 2 colonnes** :
  - Sidebar gauche : navigation par composants (collapsible)
  - Zone principale : grille de cards OU détail du composant
- **Design cohérent** : shadcn/ui pour tous les composants
- **Feedback visuel** :
  - Badges colorés selon état (vert: terminé, gris: en cours)
  - Barres de progression
  - Hover states élégants
  - Transitions fluides
- **Responsive** : Layout adaptatif
- **Thème** : Clair (possibilité de dark mode via shadcn)

---

## 📊 Statistiques et visualisation

### Au niveau Projet
- Nombre de composants
- Tâches : X/Y complétées (%)
- Barre de progression globale

### Au niveau Composant
- Badges par catégorie de tâche : 🎨 3/5 Front-end, ⚙️ 2/2 Back-end, etc.
- Badge "✓ Terminé" si toutes les tâches complétées
- Badge "🔗 Utilisé X× dans le projet" si réutilisé
- Badge "X instances" si contient d'autres composants

### Au niveau Liste de tâches
- Compteur : "5/12" tâches complétées
- Badges colorés :
  - Vert : catégorie complète
  - Gris : catégorie en cours

---

## 🎨 Design et identité visuelle

### Couleurs par catégorie de composant
- 📄 Template : Violet
- 📦 Section : Bleu
- 🔲 Composition : Vert
- 🔘 Élément : Jaune
- 🧭 Navigation : Indigo
- 🎬 Média : Rose
- 📝 Formulaire : Orange
- 📰 Contenu : Teal

### Couleurs par catégorie de tâche
- 🎨 Front-end : Bleu
- ⚙️ Back-end : Violet
- 🔍 SEO : Vert
- 🎬 Motion : Rose

### Composants UI (shadcn/ui)
- Button (variants: default, outline, ghost, destructive)
- Card (conteneur principal)
- Input / Textarea
- Select / Dropdown
- Badge (états et catégories)
- Checkbox (tâches)
- Separator (dividers)
- Progress (barres de progression)
- Sidebar (navigation)
- Collapsible (sections repliables)

---

## 🔄 Workflow typique

### Démarrage d'un nouveau projet
1. Créer un projet : "Site Menuiserie"
2. Ajouter les templates : Page Accueil, Page Contact
3. Ajouter les sections : Header, Hero, Footer
4. Ajouter les éléments : Bouton CTA, Logo, Titre

### Définir un composant (ex: Hero)
1. Sélectionner "Hero" dans la sidebar
2. Ajouter une image de référence (maquette)
3. Ajouter les tâches :
   - "Créer le template" → 🎨 Front-end
   - "Ajouter champs ACF" → ⚙️ Back-end
   - "Intégrer le HTML/CSS" → 🎨 Front-end
   - "Optimiser les images" → 🔍 SEO
4. Ajouter les composants utilisés :
   - Titre ×1
   - Bouton CTA ×2
   - Image hero ×1

### Travailler sur les tâches
1. Afficher le détail du Hero (image visible)
2. Input en bas : taper "Ajouter animation scroll" + Enter
3. Cocher les tâches au fur et à mesure
4. Drag & drop pour réorganiser par priorité

### Suivre l'avancement
1. Vue projet : "12/18 tâches (67%)"
2. ComponentList : badges colorés par catégorie
3. Sidebar : voir tous les composants d'un coup d'œil

---

## 💾 Persistance des données

- **Stockage local** : `~/Library/Application Support/scope/projects.dat` (macOS)
- **Format** : JSON sérialisé
- **Auto-save** : Chaque modification sauvegardée instantanément
- **Migration automatique** : Lors des changements de structure de données
- **Pas de serveur** : 100% local, données privées

---

## 🚀 Évolutions futures possibles

### Court terme
- [ ] Export PDF du projet (rapport d'avancement)
- [ ] Templates de projets (starter pack WordPress)
- [ ] Recherche/filtres dans la liste de composants
- [ ] Mode dark

### Moyen terme
- [ ] Champs ACF détaillés par composant
- [ ] Synchronisation cloud (optionnelle)
- [ ] Collaboration multi-utilisateurs
- [ ] Intégration Figma (import de designs)

### Long terme
- [ ] Génération de code (templates WordPress)
- [ ] Export vers Notion/Jira
- [ ] Timeline / Gantt view
- [ ] Statistiques avancées (temps passé, vélocité)

---

## 📝 Notes techniques importantes

### Performances
- Images encodées en base64 (limite 1MB par image)
- Drag & drop optimisé avec @dnd-kit
- Rendu conditionnel (grille OU détail, pas les deux)

### Sécurité
- Validation des tailles d'images
- Pas de suppression accidentelle (composants utilisés protégés)
- Confirmation implicite via UI (pas de popups intrusives)

### Accessibilité
- Composants shadcn/ui basés sur Radix (a11y native)
- Navigation clavier possible
- Focus management (auto-focus sur input de tâche)

---

## 🎓 Philosophie du projet

### Principes de design
1. **Clarté > Fonctionnalités** : Interface épurée, pas de surcharge
2. **Vitesse d'exécution** : UX optimisée pour saisie rapide (Enter, hover, drag)
3. **Visuel d'abord** : Images de référence pour garder la vision du projet
4. **Réutilisation** : Encourager la création de composants atomiques
5. **Progression visible** : Feedback constant sur l'avancement

### Développement
- **Functional over elegant** : Code qui marche avant code parfait
- **Composants découplés** : Chaque fichier < 100 lignes
- **TypeScript strict** : Typage pour éviter les bugs
- **Auto-save** : Pas de bouton "Sauvegarder", tout est automatique

---

## 📦 Structure du code

```
/
├── app/
│   ├── layout.tsx (hydratation du store)
│   └── page.tsx (routing: ProjectList | ComponentList)
├── components/
│   ├── ProjectList.tsx
│   ├── ComponentList.tsx (layout sidebar + main)
│   ├── ComponentSidebar.tsx
│   ├── ComponentGridView.tsx
│   ├── ComponentDetailView.tsx
│   ├── TaskList.tsx (drag & drop)
│   ├── ComponentInstanceList.tsx
│   ├── molecules/
│   │   ├── ProjectCard.tsx
│   │   ├── ComponentCard.tsx
│   │   ├── ComponentHeader.tsx
│   │   ├── ComponentStats.tsx
│   │   ├── ComponentProgress.tsx
│   │   ├── ComponentDetailHeader.tsx
│   │   ├── TaskItem.tsx
│   │   └── InstanceItem.tsx
│   ├── forms/
│   │   ├── ProjectForm.tsx
│   │   ├── ComponentForm.tsx
│   │   └── ComponentEditForm.tsx
│   └── ui/ (shadcn/ui components)
├── lib/
│   ├── types.ts (Project, Component, Task, etc.)
│   ├── projectStore.ts (Zustand store)
│   ├── store/
│   │   ├── types.ts
│   │   ├── projectSlice.ts
│   │   ├── componentSlice.ts
│   │   ├── taskSlice.ts
│   │   └── instanceSlice.ts
│   ├── persistence.ts (load/save)
│   ├── migrations.ts (data migration)
│   ├── categoryHelpers.ts (component categories)
│   ├── taskCategoryHelpers.ts (task categories)
│   ├── imageHelpers.ts (base64 conversion)
│   └── store.ts (Tauri store)
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/default.json (permissions)
│   └── src/main.rs
└── styles/
    └── global.css (Tailwind + shadcn variables)
```

---

## 🐛 Bugs connus / Limitations

### Actuelles
- Images limitées à 1MB (base64)
- Pas de recherche dans les composants
- Pas d'undo/redo
- Sidebar non persistente (toujours ouverte au reload)

### À surveiller
- Performance si > 100 composants dans un projet
- Taille du fichier .dat si beaucoup d'images

---

## 📚 Ressources

### Documentation
- [Next.js](https://nextjs.org/docs)
- [Tauri v2](https://v2.tauri.app/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [dnd-kit](https://dndkit.com/)

### Inspiration
- Notion (organisation hiérarchique)
- Todoist (saisie rapide de tâches)
- Linear (UX fluide, keyboard shortcuts)
- Figma (composants réutilisables)

---

## 🎯 Conclusion

**SCOPE** est une application desktop moderne qui résout un problème concret : la gestion structurée de projets WordPress complexes. En combinant :
- Une architecture de données flexible (composants réutilisables)
- Une UX ultra-rapide (saisie au clavier, drag & drop)
- Une visualisation claire (images, badges, progression)

L'outil devient un compagnon indispensable pour développer des sites WordPress de manière organisée et efficace.

---

**Dernière mise à jour :** Février 2026  
**Statut :** En développement actif  
**Version :** MVP fonctionnel
