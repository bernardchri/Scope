 Contexte

 SCOPE fait le cadrage client → PDF cahier des charges. Story-compiler fait le développement.
 Le pont entre les deux est l'export STORIES.md décrit dans docs/philosophie-et-integrations.md.

 Objectif : produire un STORIES.md lisible par Story-compiler à partir du projet SCOPE actif.
 Format défini dans philosophie-et-integrations.md : # NomComposant, <!-- estimate: Xh -->, ## Description, ## Tâches avec checkboxes GFM.

 Périmètre choisi :
 - Un seul fichier global STORIES.md (pas d'export par composant pour l'instant)
 - Documents : section séparée dans le fichier avec leur contenu markdown complet
 - Images : exclues de cette v1 (pas de base64 embarqué)

 ---
 Format de sortie

 # {Project.name}

 > {project.description}

 Exporté le {date} · {n} composants

 ---

 # {ComponentName}

 <!-- estimate: 3h -->

 ## Description

 {component.description}

 ## Tâches

 - [ ] Intégration HTML/CSS responsive
 - [ ] Menu burger mobile

 ---

 # {DocumentName}

 <!-- estimate: 2h -->

 ## Description

 {document.description}

 ## Contenu

 {document.content  ← markdown existant exporté tel quel}

 ---

 Les composants sont regroupés par catégorie (séparateur commentaire HTML), documents à la fin.

 ---
 Fichiers à créer / modifier

 1. lib/markdownExport.ts (nouveau fichier)

 Fonctions :
 - formatEstimate(hours?: number): string → \n<!-- estimate: Xh -->\n ou ""
 - generateComponentBlock(component: Component): string → bloc complet d'un composant UI
 - generateDocumentBlock(component: Component): string → bloc complet d'un document
 - generateStoriesMd(project: Project): string → assemble le fichier complet
   - En-tête projet (nom, description, date, compteur)
   - Composants groupés par catégorie (CATEGORY_ORDER de components/pdf/ProjectPDFDocument.tsx)
   - Documents en dernière section
 - exportProjectMarkdown(project: Project): Promise<void> → point d'entrée public
   - save() de @tauri-apps/plugin-dialog (default: {slug}-stories.md)
   - Génère le contenu markdown
   - invoke('write_text_file', { path, content })

 Utilitaires réutilisés :
 - slugify() from lib/persistence.ts
 - Types Project, Component, Task from lib/types.ts
 - CATEGORY_LABELS from lib/categoryHelpers.ts

 2. src-tauri/src/main.rs

 Ajouter une commande Rust write_text_file (texte UTF-8, pas de base64) :

 #[tauri::command]
 fn write_text_file(path: String, content: String) -> Result<(), String> {
     std::fs::write(&path, content.as_bytes())
         .map_err(|e| format!("Erreur écriture fichier: {}", e))
 }

 L'enregistrer dans .invoke_handler(tauri::generate_handler![..., write_text_file]).

 3. components/ProjectDashboard.tsx

 À côté du bouton "Exporter en PDF" (lignes ~312–318) :
 - Ajouter état isExportingMd: boolean
 - Ajouter handleExportMarkdown() appelant exportProjectMarkdown(project)
 - Bouton <Button> avec icône FileCode (lucide) : "Exporter STORIES.md"

 ---
 Capitalisation avec le PDF

 ┌────────────────┬─────────────────────────────────┬────────────────────────────────┐
 │     Aspect     │           PDF export            │        Markdown export         │
 ├────────────────┼─────────────────────────────────┼────────────────────────────────┤
 │ Déclencheur UI │ Bouton dans ProjectDashboard    │ Idem                           │
 ├────────────────┼─────────────────────────────────┼────────────────────────────────┤
 │ Dialog         │ save() plugin-dialog            │ Idem                           │
 ├────────────────┼─────────────────────────────────┼────────────────────────────────┤
 │ IPC Rust       │ write_pdf_file (base64 binaire) │ write_text_file (string UTF-8) │
 ├────────────────┼─────────────────────────────────┼────────────────────────────────┤
 │ Rendu          │ @react-pdf/renderer React       │ Template string pur            │
 ├────────────────┼─────────────────────────────────┼────────────────────────────────┤
 │ Données        │ Project → React elements        │ Project → string               │
 └────────────────┴─────────────────────────────────┴────────────────────────────────┘

 La capitalisation est au niveau du pattern (même architecture), pas du code partagé.
 renderMarkdown.tsx n'est pas réutilisé (il fait markdown→PDF, pas markdown→markdown).

 ---
 Vérification

 1. npm run tauri → ouvrir un projet avec composants + documents
 2. Cliquer "Exporter STORIES.md" → dialog de sauvegarde → choisir un emplacement
 3. Ouvrir le fichier généré dans un éditeur markdown :
   - En-tête projet présent
   - Chaque composant avec <!-- estimate: Xh -->, description, tâches en checkboxes
   - Section documents avec contenu markdown intact
   - Séparateurs --- entre les blocs
 4. Cas limites : composant sans description, sans tâches, sans estimation → pas de sections vides

 ---
 Ce qui reste pour la suite (hors scope)

 - Export par composant (un .md par composant dans un dossier)
 - Images exportées en PNG référencées dans le markdown
 - Tâches "v2" (nécessite d'abord l'ajout du champ dans le modèle Task)