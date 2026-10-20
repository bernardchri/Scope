//! Serveur MCP (Model Context Protocol, transport HTTP « streamable », JSON seul) servi
//! par le pont local sur `POST /mcp`. Il permet à Claude Code de lire le projet ouvert
//! dans SCOPE : l'app publie un instantané (JSON, sans images) que ces outils interrogent.
//!
//! Ce module ne touche ni au réseau ni à Tauri : `handle` reçoit le corps de la requête
//! et l'instantané, et renvoie la réponse JSON-RPC (ou `None` pour une notification).

use serde_json::{json, Value};

/// Instantané du projet ouvert, partagé entre la commande Tauri qui le met à jour et le pont.
#[derive(Clone, Default)]
pub struct McpSnapshot(pub std::sync::Arc<std::sync::Mutex<String>>);

/// Commandes d'écriture en attente de la réponse de l'app, par identifiant.
#[derive(Clone, Default)]
pub struct McpPending(pub std::sync::Arc<std::sync::Mutex<std::collections::HashMap<String, std::sync::mpsc::Sender<Value>>>>);

/// Délai laissé à l'app pour appliquer une commande avant de la déclarer perdue.
const COMMAND_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(15);

/// Émet `mcp-command` vers l'app et attend la réponse envoyée par `mcp_respond`.
pub fn dispatch_to_app(app: &tauri::AppHandle, pending: &McpPending, tool: &str, args: &Value) -> Result<Value, String> {
    use std::sync::atomic::{AtomicU64, Ordering};
    use tauri::Emitter;
    static NEXT: AtomicU64 = AtomicU64::new(1);
    let id = format!("mcp-{}", NEXT.fetch_add(1, Ordering::Relaxed));
    let (tx, rx) = std::sync::mpsc::channel();
    pending.0.lock().map_err(|_| "File d'attente verrouillée".to_string())?.insert(id.clone(), tx);

    if app.emit("mcp-command", json!({ "id": id, "tool": tool, "args": args })).is_err() {
        pending.0.lock().ok().map(|mut m| m.remove(&id));
        return Err("Impossible de joindre l'application.".to_string());
    }
    let outcome = rx.recv_timeout(COMMAND_TIMEOUT);
    pending.0.lock().ok().map(|mut m| m.remove(&id));
    match outcome {
        Ok(o) if o["ok"] == Value::Bool(true) => Ok(o["result"].clone()),
        Ok(o) => Err(o["error"].as_str().unwrap_or("Commande refusée.").to_string()),
        Err(_) => Err("SCOPE n'a pas répondu à temps : un projet est-il ouvert dans l'application ?".to_string()),
    }
}

/// Transmet la réponse de l'app à la requête qui l'attend.
pub fn resolve(pending: &McpPending, id: &str, outcome: Value) {
    if let Ok(mut map) = pending.0.lock() {
        if let Some(tx) = map.remove(id) {
            let _ = tx.send(outcome);
        }
    }
}

const SERVER_INSTRUCTIONS: &str = "SCOPE est un outil de documentation de projets web (composants, templates, sections, documents). \
Les éléments portent des images annotées par des pins numérotés ; chaque pin peut être qualifié (type, contraintes, collection de contenu). \
Commence par get_project puis get_issues pour voir ce qui reste à compléter ; get_build_brief donne en un appel tout ce qu'il faut pour construire un élément, et tu coches ses tâches avec update_task au fil du développement. get_component_image montre la maquette ; qualify_pin et add_pin qualifient les pins (mêmes types et précisions que l'éditeur de SCOPE) ; update_component, add_task, update_task, delete_task, set_text et delete_text modifient la description, les tâches et les textes des documents ; create_collection, update_collection, delete_collection, add_field, update_field et delete_field gèrent le modèle de contenu (list_collections le lit). Les modifications sont appliquées dans l'app et annulables (Cmd+Z). Pour avancer : get_next_tasks, puis update_tasks pour cocher (avec une note), link_code pour dire où est le code.";

fn tools() -> Value {
    json!([
        {
            "name": "get_project",
            "description": "Résumé du projet ouvert dans SCOPE : nom, client, version, nombre d'éléments par type, de collections et de points à compléter.",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "list_components",
            "description": "Liste les éléments du projet (id, nom, type, nombre de pins et de pins à préciser). Filtre optionnel par type.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "category": { "type": "string", "enum": ["document", "component", "template", "section"], "description": "Ne garder que ce type d'élément." }
                }
            }
        },
        {
            "name": "get_component",
            "description": "Fiche complète d'un élément : description, tâches, notes (contenu des documents), images avec leurs pins qualifiés, composants utilisés, ressources.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string", "description": "Identifiant de l'élément (voir list_components)." },
                    "name": { "type": "string", "description": "Nom de l'élément, si l'id n'est pas connu." }
                }
            }
        },
        {
            "name": "list_collections",
            "description": "Modèle de contenu du projet : collections (types de contenu) et leurs champs, répéteurs compris.",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "create_collection",
            "description": "Crée une collection (type de contenu) dans le modèle de contenu, avec éventuellement ses champs. Chaque champ : name, kind (title, text, image, link, number, date, category, boolean, relation, repeater, other), specs (précisions du type, comme qualify_pin), relationTo (collection pointée, pour une relation), multiple, required, note, subFields (champs d'une ligne, pour un répéteur).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "Nom de la collection, ex. Projets." },
                    "slug": { "type": "string", "description": "Identifiant technique ; déduit du nom par défaut." },
                    "description": { "type": "string" },
                    "hasDetailPage": { "type": "boolean", "description": "Chaque entrée a sa propre page de détail." },
                    "fields": { "type": "array", "items": { "type": "object", "additionalProperties": true }, "description": "Champs à créer, dans l'ordre." }
                },
                "required": ["name"]
            }
        },
        {
            "name": "update_collection",
            "description": "Modifie une collection : nom, slug, description, page de détail. Une description vide l'efface.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "collection": { "type": "string", "description": "Nom, slug ou id de la collection (voir list_collections)." },
                    "name": { "type": "string" },
                    "slug": { "type": "string" },
                    "description": { "type": "string" },
                    "hasDetailPage": { "type": "boolean" }
                },
                "required": ["collection"]
            }
        },
        {
            "name": "delete_collection",
            "description": "Supprime une collection. Les relations des autres collections qui pointaient vers elle sont retirées ; la réponse signale les éléments dont des pins ou la page y sont encore liés.",
            "inputSchema": {
                "type": "object",
                "properties": { "collection": { "type": "string", "description": "Nom, slug ou id." } },
                "required": ["collection"]
            }
        },
        {
            "name": "add_field",
            "description": "Ajoute un champ à une collection (à la fin, ou dans un répéteur avec `parent`). Mêmes paramètres que les champs de create_collection.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "collection": { "type": "string" },
                    "name": { "type": "string", "description": "Nom du champ." },
                    "kind": { "type": "string", "description": "text par défaut." },
                    "specs": { "type": "object", "additionalProperties": true },
                    "relationTo": { "type": "string", "description": "Collection pointée (kind relation)." },
                    "multiple": { "type": "boolean" },
                    "required": { "type": "boolean" },
                    "note": { "type": "string" },
                    "subFields": { "type": "array", "items": { "type": "object", "additionalProperties": true } },
                    "parent": { "type": "string", "description": "Champ répéteur (nom, chemin « galerie › image » ou id) qui reçoit ce sous-champ." }
                },
                "required": ["collection", "name"]
            }
        },
        {
            "name": "update_field",
            "description": "Modifie un champ de collection : nom, type (changer de type efface précisions et lien), specs, relationTo, multiple, required, note. Une valeur vide efface la note ou le lien.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "collection": { "type": "string" },
                    "field": { "type": "string", "description": "Nom, chemin « galerie › image » ou id du champ (voir list_collections)." },
                    "name": { "type": "string" },
                    "kind": { "type": "string" },
                    "specs": { "type": "object", "additionalProperties": true },
                    "relationTo": { "type": "string" },
                    "multiple": { "type": "boolean" },
                    "required": { "type": "boolean" },
                    "note": { "type": "string" }
                },
                "required": ["collection", "field"]
            }
        },
        {
            "name": "delete_field",
            "description": "Supprime un champ d'une collection (avec ses sous-champs s'il s'agit d'un répéteur).",
            "inputSchema": {
                "type": "object",
                "properties": { "collection": { "type": "string" }, "field": { "type": "string" } },
                "required": ["collection", "field"]
            }
        },
        {
            "name": "get_component_image",
            "description": "Renvoie l'image d'un élément (sans pins incrustés) avec la liste de ses pins et leurs positions (x, y en % depuis le coin haut-gauche), pour qualifier les pins en voyant la maquette.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "component": { "type": "string", "description": "Id ou nom de l'élément." },
                    "image": { "type": "string", "description": "Id ou rang (1, 2…) de l'image ; l'image principale par défaut." }
                },
                "required": ["component"]
            }
        },
        {
            "name": "qualify_pin",
            "description": "Qualifie un pin existant. kind : title, text, image, button, link, list, form, number, date, category, boolean, relation, repeater, other (changer de type efface les précisions et liens). specs : objet de précisions du type, clés par type — title : maxLength, editable, seo ; text : maxLength, editable, format ; image : size, editable, alt ; button : maxLength, target, editable ; link : target, editable ; list : count, source, editable ; form : fields, recipient ; number : range, unit, editable ; date : format, editable ; category : choice, values, hierarchy ; boolean : editable ; relation : multiple ; repeater : minRows, maxRows, rowSource, rowFields. Les champs à liste fermée (editable, seo…) refusent une valeur inconnue et indiquent les valeurs permises. Une valeur vide efface la précision.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "component": { "type": "string", "description": "Id ou nom de l'élément." },
                    "pin": { "type": "integer", "description": "Numéro du pin sur l'image." },
                    "image": { "type": "string", "description": "Id ou rang de l'image, si l'élément en a plusieurs (principale par défaut)." },
                    "kind": { "type": "string", "description": "Type du pin ; chaîne vide pour le retirer." },
                    "specs": { "type": "object", "description": "Précisions du type (voir description).", "additionalProperties": true },
                    "note": { "type": "string", "description": "Précision libre (comportement, contrainte, exemple)." },
                    "isTask": { "type": "boolean", "description": "Par défaut chaque pin est une tâche ; false = ce pin n'est pas une tâche (ses tâches non faites sont retirées), true = en refaire une." },
                    "label": { "type": "string", "description": "Nom du pin." },
                    "collection": { "type": "string", "description": "Collection liée (nom ou id) : pour un pin list ou relation, ou avec `field`." },
                    "field": { "type": "string", "description": "Champ de la collection d'où vient la donnée (nom ou chemin « galerie › image »)." }
                },
                "required": ["component", "pin"]
            }
        },
        {
            "name": "add_pin",
            "description": "Ajoute un pin sur l'image d'un élément (position en % depuis le coin haut-gauche), éventuellement déjà qualifié (mêmes paramètres que qualify_pin).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "component": { "type": "string", "description": "Id ou nom de l'élément." },
                    "x": { "type": "number", "description": "Position horizontale, 0 à 100." },
                    "y": { "type": "number", "description": "Position verticale, 0 à 100." },
                    "image": { "type": "string" },
                    "kind": { "type": "string" },
                    "specs": { "type": "object", "additionalProperties": true },
                    "note": { "type": "string" },
                    "label": { "type": "string" },
                    "collection": { "type": "string" },
                    "field": { "type": "string" }
                },
                "required": ["component", "x", "y"]
            }
        },
        {
            "name": "update_component",
            "description": "Modifie un élément : nom, description (texte fonctionnel), type, heures estimées et, pour un template, sa page (route, titre et description SEO, collection affichée et rôle). Une valeur vide efface la description ; estimatedHours null efface l'estimation.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "component": { "type": "string", "description": "Id ou nom de l'élément." },
                    "name": { "type": "string" },
                    "description": { "type": "string" },
                    "category": { "type": "string", "enum": ["document", "component", "template", "section"] },
                    "estimatedHours": { "type": ["number", "null"] },
                    "route": { "type": "string", "description": "Adresse de la page (templates), ex. /ouvrages/:slug." },
                    "seoTitle": { "type": "string" },
                    "seoDescription": { "type": "string" },
                    "collection": { "type": "string", "description": "Collection affichée par la page (nom ou id) ; vide pour retirer." },
                    "collectionRole": { "type": "string", "enum": ["single", "list"], "description": "single : fiche d'une entrée ; list : liste des entrées." }
                },
                "required": ["component"]
            }
        },
        {
            "name": "add_task",
            "description": "Ajoute une tâche à un élément (catégories : frontend, backend, seo, motion). outOfScope = évolution v2, exclue du chiffrage. pin relie la tâche à un pin de l'image.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "component": { "type": "string" },
                    "name": { "type": "string", "description": "Intitulé de la tâche." },
                    "category": { "type": "string", "enum": ["frontend", "backend", "seo", "motion"], "description": "frontend par défaut." },
                    "note": { "type": "string", "description": "Précision ou trace de ce qui a été fait." },
                    "outOfScope": { "type": "boolean" },
                    "completed": { "type": "boolean" },
                    "pin": { "type": "integer", "description": "Numéro du pin à relier." },
                    "image": { "type": "string", "description": "Id ou rang de l'image du pin (principale par défaut)." }
                },
                "required": ["component", "name"]
            }
        },
        {
            "name": "update_task",
            "description": "Modifie une tâche (repérée par son id ou son nom exact) : intitulé, catégorie, état, hors périmètre, pin lié (0 pour délier).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "component": { "type": "string" },
                    "task": { "type": "string", "description": "Id ou nom exact de la tâche (voir get_component)." },
                    "forPin": { "type": "integer", "description": "À la place de `task` : numéro du pin auquel la tâche est liée." },
                    "note": { "type": "string", "description": "Trace de ce qui a été fait : fichier, commit, décision." },
                    "name": { "type": "string" },
                    "category": { "type": "string", "enum": ["frontend", "backend", "seo", "motion"] },
                    "completed": { "type": "boolean" },
                    "outOfScope": { "type": "boolean" },
                    "pin": { "type": "integer" },
                    "image": { "type": "string" }
                },
                "required": ["component", "task"]
            }
        },
        {
            "name": "delete_task",
            "description": "Supprime une tâche (id ou nom exact).",
            "inputSchema": {
                "type": "object",
                "properties": { "component": { "type": "string" }, "task": { "type": "string" } },
                "required": ["component", "task"]
            }
        },
        {
            "name": "set_text",
            "description": "Écrit un texte Markdown dans un élément, en particulier un document. Avec `id` (voir `texts` dans get_component) : remplace ce texte, ou le complète si mode = append. Sans `id` : ajoute un nouveau bloc à la fin (type notes par défaut, paragraph ou comment) ; le bloc de notes vide d'un document vierge est rempli au lieu d'en ajouter un second.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "component": { "type": "string" },
                    "content": { "type": "string", "description": "Texte Markdown." },
                    "id": { "type": "string", "description": "Identifiant du texte à modifier." },
                    "mode": { "type": "string", "enum": ["replace", "append"], "description": "replace par défaut ; append ajoute à la suite du texte existant." },
                    "type": { "type": "string", "enum": ["notes", "paragraph", "heading1", "heading2", "heading3", "bullet", "comment"], "description": "Type du nouveau bloc (sans id) : paragraph, heading1 à heading3 (titres), bullet (puce, une par ligne), notes (Markdown libre) ou comment." }
                },
                "required": ["component", "content"]
            }
        },
        {
            "name": "delete_text",
            "description": "Supprime un texte d'un élément (id visible dans get_component).",
            "inputSchema": {
                "type": "object",
                "properties": { "component": { "type": "string" }, "id": { "type": "string" } },
                "required": ["component", "id"]
            }
        },
        {
            "name": "get_design_tokens",
            "description": "Design tokens du projet, synchronisés depuis Figma : variables (par collection et mode), styles de texte, de couleur et d'effet. Renvoie un résumé en tableaux Markdown, le CSS (variables et classes .text-*) et le JSON au format Design Tokens.",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "get_next_tasks",
            "description": "Prochaines tâches à faire dans tout le projet, dans l'ordre de construction (les éléments dont les autres dépendent d'abord), avec l'avancement global. Évite de parcourir les éléments un par un. Filtres : category (frontend, backend, seo, motion), component, limit (10 par défaut, 50 au plus).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "limit": { "type": "integer" },
                    "category": { "type": "string", "enum": ["frontend", "backend", "seo", "motion"] },
                    "component": { "type": "string", "description": "Id ou nom d'un élément : ses tâches seulement." }
                }
            }
        },
        {
            "name": "get_progress",
            "description": "Avancement du projet : pourcentage global (pondéré par les heures estimées), tâches faites par catégorie (front-end, back-end, SEO, motion) et avancement de chaque élément.",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "update_tasks",
            "description": "Modifie plusieurs tâches d'un élément d'un coup (tout ou rien) : coche, annote, renomme, change de catégorie. Chaque item désigne sa tâche par `task` (id ou nom exact) ou par `forPin` (numéro de son pin).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "component": { "type": "string" },
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "task": { "type": "string" },
                                "forPin": { "type": "integer" },
                                "completed": { "type": "boolean" },
                                "note": { "type": "string", "description": "Trace de ce qui a été fait : fichier, commit, décision." },
                                "name": { "type": "string" },
                                "category": { "type": "string", "enum": ["frontend", "backend", "seo", "motion"] },
                                "outOfScope": { "type": "boolean" }
                            }
                        }
                    }
                },
                "required": ["component", "items"]
            }
        },
        {
            "name": "link_code",
            "description": "Enregistre où se trouve le code d'un élément (fichiers du site, branche, commit) : affiché dans SCOPE et dans l'export Markdown. Les fichiers s'ajoutent à ceux déjà connus (replace: true pour remplacer, clear: true pour effacer).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "component": { "type": "string" },
                    "files": { "type": "array", "items": { "type": "string" } },
                    "branch": { "type": "string" },
                    "commit": { "type": "string" },
                    "replace": { "type": "boolean" },
                    "clear": { "type": "boolean" }
                },
                "required": ["component"]
            }
        },
        {
            "name": "get_build_brief",
            "description": "Brief de développement d'un élément, en un seul appel : reste à faire (avec les id de tâches), design tokens, modèle de contenu concerné, éléments à réutiliser dans l'ordre de construction, puis la fiche complète. À lire avant de coder un élément ; la maquette se regarde avec get_component_image.",
            "inputSchema": {
                "type": "object",
                "properties": { "component": { "type": "string", "description": "Id ou nom de l'élément." } },
                "required": ["component"]
            }
        },
        {
            "name": "get_issues",
            "description": "Ce qui reste à compléter : pins sans type ni précision, collections ou relations incomplètes, références cassées.",
            "inputSchema": { "type": "object", "properties": {} }
        }
    ])
}

/// Un texte (ex. un brief Markdown) est renvoyé tel quel ; tout autre JSON est mis en forme.
fn text_result(value: &Value) -> Value {
    let text = match value.as_str() {
        Some(raw) => raw.to_string(),
        None => serde_json::to_string_pretty(value).unwrap_or_default(),
    };
    json!({ "content": [{ "type": "text", "text": text }] })
}

fn error_result(message: &str) -> Value {
    json!({ "isError": true, "content": [{ "type": "text", "text": message }] })
}

fn count_pins(component: &Value) -> (usize, usize) {
    let mut total = 0;
    let mut open = 0;
    for image in component["images"].as_array().into_iter().flatten() {
        for pin in image["pins"].as_array().into_iter().flatten() {
            total += 1;
            if pin["qualified"] == Value::Bool(false) {
                open += 1;
            }
        }
    }
    (total, open)
}

fn find_component<'a>(components: &'a [Value], args: &Value) -> Option<&'a Value> {
    if let Some(id) = args["id"].as_str() {
        if let Some(found) = components.iter().find(|c| c["id"].as_str() == Some(id)) {
            return Some(found);
        }
    }
    let name = args["name"].as_str()?.to_lowercase();
    components
        .iter()
        .find(|c| c["name"].as_str().map(|n| n.to_lowercase()) == Some(name.clone()))
        .or_else(|| components.iter().find(|c| c["name"].as_str().map_or(false, |n| n.to_lowercase().contains(&name))))
}

/// Envoie une commande d'écriture à l'app et attend son résultat (`Err` = refus ou délai dépassé).
pub type Dispatch<'a> = &'a dyn Fn(&str, &Value) -> Result<Value, String>;

/// Image d'un élément, lue sur le disque, avec ses pins : réponse MCP à deux blocs (texte + image).
fn image_result(args: &Value, snapshot: &Value) -> Value {
    let components = snapshot["components"].as_array().cloned().unwrap_or_default();
    let component = match find_component(&components, &json!({ "id": args["component"], "name": args["component"] })) {
        Some(c) => c,
        None => return error_result("Élément introuvable (voir list_components)."),
    };
    let images = component["images"].as_array().cloned().unwrap_or_default();
    let wanted = args["image"].as_str();
    let image = match wanted {
        Some(w) => images
            .iter()
            .find(|i| i["id"].as_str() == Some(w))
            .or_else(|| w.parse::<usize>().ok().and_then(|n| n.checked_sub(1)).and_then(|n| images.get(n))),
        None => images.iter().find(|i| i["isPrimary"] == Value::Bool(true)).or_else(|| images.first()),
    };
    let image = match image {
        Some(i) => i,
        None => return error_result("Cet élément n'a pas d'image."),
    };
    let (folder, filename) = match (snapshot["project"]["folderPath"].as_str(), image["filename"].as_str()) {
        (Some(f), Some(n)) => (f, n),
        _ => return error_result("Image indisponible sur le disque."),
    };
    let path = std::path::Path::new(folder).join("img").join(filename);
    let bytes = match std::fs::read(&path) {
        Ok(b) => b,
        Err(e) => return error_result(&format!("Lecture de l'image impossible : {}", e)),
    };
    use base64::{engine::general_purpose, Engine as _};
    let mime = match path.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()).as_deref() {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        _ => "image/png",
    };
    let info = json!({ "component": component["name"], "image": image["id"], "caption": image["caption"], "pins": image["pins"] });
    json!({ "content": [
        { "type": "text", "text": serde_json::to_string_pretty(&info).unwrap_or_default() },
        { "type": "image", "data": general_purpose::STANDARD.encode(bytes), "mimeType": mime },
    ] })
}

fn call_tool(name: &str, args: &Value, snapshot: &Value, dispatch: Dispatch) -> Value {
    if snapshot.is_null() {
        return error_result("Aucun projet n'est ouvert dans SCOPE. Ouvre un projet dans l'application.");
    }
    let empty = Vec::new();
    let components = snapshot["components"].as_array().unwrap_or(&empty);

    match name {
        "get_project" => {
            let mut by_category = serde_json::Map::new();
            for c in components {
                let key = c["category"].as_str().unwrap_or("component").to_string();
                let n = by_category.get(&key).and_then(|v| v.as_u64()).unwrap_or(0);
                by_category.insert(key, json!(n + 1));
            }
            text_result(&json!({
                "project": snapshot["project"],
                "components": by_category,
                "collections": snapshot["collections"].as_array().map_or(0, |a| a.len()),
                "issues": snapshot["issues"].as_array().map_or(0, |a| a.len()),
            }))
        }
        "list_components" => {
            let filter = args["category"].as_str();
            let list: Vec<Value> = components
                .iter()
                .filter(|c| filter.map_or(true, |f| c["category"].as_str() == Some(f)))
                .map(|c| {
                    let (pins, open) = count_pins(c);
                    json!({
                        "id": c["id"], "name": c["name"], "category": c["category"],
                        "pins": pins, "pinsToQualify": open,
                    })
                })
                .collect();
            text_result(&json!(list))
        }
        "get_component" => match find_component(components, args) {
            Some(c) => text_result(c),
            None => error_result("Élément introuvable : donne un id ou un nom exact (voir list_components)."),
        },
        "get_component_image" => image_result(args, snapshot),
        "qualify_pin" | "add_pin" | "get_build_brief" | "get_next_tasks" | "get_progress" | "update_tasks" | "link_code" | "update_component" | "add_task" | "update_task" | "delete_task" | "set_text" | "delete_text" | "create_collection" | "update_collection" | "delete_collection" | "add_field" | "update_field" | "delete_field" => match dispatch(name, args) {
            Ok(result) => text_result(&result),
            Err(message) => error_result(&message),
        },
        "list_collections" => text_result(&snapshot["collections"]),
        "get_design_tokens" => {
            if snapshot["tokens"].is_null() {
                error_result("Aucun token : envoie les variables et styles depuis le plugin Figma (section « Design tokens »).")
            } else {
                text_result(&snapshot["tokens"])
            }
        }
        "get_issues" => text_result(&snapshot["issues"]),
        _ => error_result(&format!("Outil inconnu : {}", name)),
    }
}

fn rpc_result(id: &Value, result: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "result": result })
}

fn rpc_error(id: &Value, code: i64, message: &str) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } })
}

/// Commandes proposées par Claude Code (`/mcp__scope__construire slider-home`) : un texte de consignes, avec le brief si besoin.
fn prompts() -> Value {
    let element = json!([{ "name": "element", "description": "Nom ou id de l'élément (voir list_components).", "required": true }]);
    json!([
        { "name": "construire", "description": "Construire un élément : brief complet, puis développement tâche par tâche en cochant l'avancement dans SCOPE.", "arguments": element },
        { "name": "planifier", "description": "Créer la todo-liste d'un élément à partir de sa maquette, de ses pins et de sa description.", "arguments": element },
        { "name": "point", "description": "Faire le point sur l'avancement du projet et proposer les prochaines tâches.", "arguments": [] }
    ])
}

fn prompt_message(description: &str, text: String) -> Value {
    json!({ "description": description, "messages": [{ "role": "user", "content": { "type": "text", "text": text } }] })
}

fn get_prompt(params: &Value, dispatch: Dispatch) -> Result<Value, String> {
    let name = params["name"].as_str().unwrap_or("");
    let element = params["arguments"]["element"].as_str().unwrap_or("").trim().to_string();
    let brief = |element: &str| -> Result<String, String> {
        if element.is_empty() {
            return Err("Précise l'élément (argument `element`).".to_string());
        }
        match dispatch("get_build_brief", &json!({ "component": element }))? {
            Value::String(text) => Ok(text),
            other => Ok(other.to_string()),
        }
    };
    match name {
        "construire" => Ok(prompt_message(
            "Construire un élément",
            format!(
                "Tu développes le site décrit dans SCOPE. Voici le brief de l'élément « {} ».\n\n\
                 1. Regarde la maquette (`get_component_image`) avant d'écrire du code.\n\
                 2. Construis dans l'ordre indiqué, en réutilisant les éléments déjà faits.\n\
                 3. Au fil de l'eau, coche les tâches terminées avec `update_tasks` (`completed: true`) et une `note` courte : fichier, commit ou décision.\n\
                 4. Si tu découvres un travail non prévu, ajoute la tâche avec `add_task` ; si un pin ou un champ est ambigu, dis-le plutôt que d'inventer.\n\
                 5. À la fin, enregistre où est le code avec `link_code`, puis fais le point avec `get_progress`.\n\n---\n\n{}",
                element,
                brief(&element)?
            ),
        )),
        "planifier" => Ok(prompt_message(
            "Planifier un élément",
            format!(
                "Planifie l'élément « {} » dans SCOPE. Lis le brief ci-dessous et regarde la maquette (`get_component_image`).\n\n\
                 - Chaque pin a déjà sa tâche automatique : ne les double pas.\n\
                 - Ajoute avec `add_task` ce qui ne se voit pas sur l'image : comportement (interactions, états), responsive, accessibilité, SEO, travail côté données/serveur, motion. Une tâche = un livrable vérifiable, rangée dans la bonne catégorie.\n\
                 - Renseigne `estimatedHours` avec `update_component` s'il manque, en cohérence avec la liste.\n\
                 - Ne code rien : propose la liste, crée-la, puis résume-la en quelques lignes.\n\n---\n\n{}",
                element,
                brief(&element)?
            ),
        )),
        "point" => Ok(prompt_message(
            "Point d'avancement",
            "Fais le point sur le projet SCOPE : appelle `get_progress` puis `get_next_tasks` (limit 10) et `get_issues`. \
             Résume en cinq lignes : avancement global, ce qui est fait, ce qui n'est pas planifié ou reste à préciser, \
             et propose les trois prochaines tâches à attaquer."
                .to_string(),
        )),
        _ => Err(format!("Commande inconnue : {}", name)),
    }
}

/// Traite un message JSON-RPC. `None` = notification (pas de réponse à envoyer).
pub fn handle(body: &str, snapshot_json: &str, dispatch: Dispatch) -> Option<String> {
    let request: Value = match serde_json::from_str(body) {
        Ok(v) => v,
        Err(_) => return Some(rpc_error(&Value::Null, -32700, "JSON invalide").to_string()),
    };
    let method = request["method"].as_str().unwrap_or("");
    let id = request.get("id").cloned();

    // Sans `id`, c'est une notification (ex. notifications/initialized) : on ne répond pas.
    let id = match id {
        Some(id) => id,
        None => return None,
    };

    let response = match method {
        "initialize" => rpc_result(
            &id,
            json!({
                "protocolVersion": request["params"]["protocolVersion"].as_str().unwrap_or("2025-03-26"),
                "capabilities": { "tools": {}, "prompts": {} },
                "serverInfo": { "name": "scope", "version": env!("CARGO_PKG_VERSION") },
                "instructions": SERVER_INSTRUCTIONS,
            }),
        ),
        "ping" => rpc_result(&id, json!({})),
        "tools/list" => rpc_result(&id, json!({ "tools": tools() })),
        "prompts/list" => rpc_result(&id, json!({ "prompts": prompts() })),
        "prompts/get" => match get_prompt(&request["params"], dispatch) {
            Ok(result) => rpc_result(&id, result),
            Err(message) => rpc_error(&id, -32602, &message),
        },
        "tools/call" => {
            let snapshot: Value = serde_json::from_str(snapshot_json).unwrap_or(Value::Null);
            let name = request["params"]["name"].as_str().unwrap_or("");
            rpc_result(&id, call_tool(name, &request["params"]["arguments"], &snapshot, dispatch))
        }
        _ => rpc_error(&id, -32601, "Méthode inconnue"),
    };
    Some(response.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    const SNAPSHOT: &str = r#"{
      "project": {"name": "Site"},
      "components": [
        {"id": "a", "name": "Home", "category": "template", "images": [{"pins": [{"qualified": true}, {"qualified": false}]}]},
        {"id": "b", "name": "Slider", "category": "component", "images": []}
      ],
      "collections": [{"name": "Projets"}],
      "issues": [{"id": "x"}]
    }"#;

    fn call(method: &str, params: Value) -> Value {
        let body = json!({ "jsonrpc": "2.0", "id": 1, "method": method, "params": params }).to_string();
        serde_json::from_str(&handle(&body, SNAPSHOT, &|_, _| Ok(json!({ "ok": true }))).unwrap()).unwrap()
    }

    #[test]
    fn initialize_annonce_les_outils() {
        let r = call("initialize", json!({ "protocolVersion": "2025-06-18" }));
        assert_eq!(r["result"]["protocolVersion"], "2025-06-18");
        assert!(r["result"]["capabilities"]["tools"].is_object());
    }

    #[test]
    fn notification_sans_reponse() {
        let body = json!({ "jsonrpc": "2.0", "method": "notifications/initialized" }).to_string();
        assert!(handle(&body, SNAPSHOT, &|_, _| Ok(json!({}))).is_none());
    }

    #[test]
    fn liste_et_filtre_les_elements() {
        let r = call("tools/call", json!({ "name": "list_components", "arguments": { "category": "template" } }));
        let text = r["result"]["content"][0]["text"].as_str().unwrap();
        let list: Value = serde_json::from_str(text).unwrap();
        assert_eq!(list.as_array().unwrap().len(), 1);
        assert_eq!(list[0]["pins"], 2);
        assert_eq!(list[0]["pinsToQualify"], 1);
    }

    #[test]
    fn fiche_par_id_inconnu_retombe_sur_le_nom() {
        // get_component_image passe la même valeur comme id et comme nom.
        let r = call("tools/call", json!({ "name": "get_component", "arguments": { "id": "home", "name": "home" } }));
        assert!(r["result"]["content"][0]["text"].as_str().unwrap().contains("\"Home\""));
    }

    #[test]
    fn fiche_par_nom_approchant() {
        let r = call("tools/call", json!({ "name": "get_component", "arguments": { "name": "slid" } }));
        assert!(r["result"]["content"][0]["text"].as_str().unwrap().contains("\"Slider\""));
        let r = call("tools/call", json!({ "name": "get_component", "arguments": { "name": "absent" } }));
        assert_eq!(r["result"]["isError"], true);
    }

    #[test]
    fn ecriture_deleguee_a_l_app() {
        let r = call("tools/call", json!({ "name": "qualify_pin", "arguments": { "component": "a", "pin": 1 } }));
        assert!(r["result"]["content"][0]["text"].as_str().unwrap().contains("\"ok\": true"));
        let body = json!({ "jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": { "name": "add_pin", "arguments": {} } }).to_string();
        let r: Value = serde_json::from_str(&handle(&body, SNAPSHOT, &|_, _| Err("refusé".to_string())).unwrap()).unwrap();
        assert_eq!(r["result"]["isError"], true);
        assert_eq!(r["result"]["content"][0]["text"], "refusé");
    }

    #[test]
    fn tous_les_outils_sont_annonces() {
        let r = call("tools/list", json!({}));
        let names: Vec<&str> = r["result"]["tools"].as_array().unwrap().iter().map(|t| t["name"].as_str().unwrap()).collect();
        for expected in ["get_project", "list_components", "get_component", "get_component_image", "qualify_pin", "add_pin", "update_component", "add_task", "update_task", "delete_task", "set_text", "delete_text", "create_collection", "update_collection", "delete_collection", "add_field", "update_field", "delete_field", "get_build_brief", "get_next_tasks", "get_progress", "update_tasks", "link_code", "list_collections", "get_design_tokens", "get_issues"] {
            assert!(names.contains(&expected), "{} manquant", expected);
        }
    }

    #[test]
    fn commandes_claude_code() {
        let r = call("prompts/list", json!({}));
        let names: Vec<&str> = r["result"]["prompts"].as_array().unwrap().iter().map(|p| p["name"].as_str().unwrap()).collect();
        assert_eq!(names, ["construire", "planifier", "point"]);
        let r = call("initialize", json!({}));
        assert!(r["result"]["capabilities"]["prompts"].is_object());

        // « point » n'a besoin d'aucun élément ; « construire » embarque le brief fourni par l'app.
        let r = call("prompts/get", json!({ "name": "point" }));
        assert!(r["result"]["messages"][0]["content"]["text"].as_str().unwrap().contains("get_progress"));
        let body = json!({ "jsonrpc": "2.0", "id": 1, "method": "prompts/get", "params": { "name": "construire", "arguments": { "element": "slider-home" } } }).to_string();
        let r: Value = serde_json::from_str(&handle(&body, SNAPSHOT, &|tool, args| {
            assert_eq!(tool, "get_build_brief");
            assert_eq!(args["component"], "slider-home");
            Ok(json!("# Brief de développement : slider-home"))
        }).unwrap()).unwrap();
        let text = r["result"]["messages"][0]["content"]["text"].as_str().unwrap();
        assert!(text.contains("update_tasks") && text.contains("# Brief de développement : slider-home"));

        // sans élément ou avec une commande inconnue : erreur JSON-RPC claire
        assert!(call("prompts/get", json!({ "name": "construire" }))["error"]["message"].as_str().unwrap().contains("élément"));
        assert!(call("prompts/get", json!({ "name": "inconnue" }))["error"].is_object());
    }

    #[test]
    fn sans_projet_ouvert() {
        let body = json!({ "jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": { "name": "get_project" } }).to_string();
        let r: Value = serde_json::from_str(&handle(&body, "", &|_, _| Ok(json!({}))).unwrap()).unwrap();
        assert_eq!(r["result"]["isError"], true);
    }
}
