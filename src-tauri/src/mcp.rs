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

const SERVER_INSTRUCTIONS: &str = "SCOPE est un outil de documentation de projets web (composants, templates, sections, documents). \
Les éléments portent des images annotées par des pins numérotés ; chaque pin peut être qualifié (type, contraintes, collection de contenu). \
Commence par get_project puis get_issues pour voir ce qui reste à compléter. Lecture seule pour l'instant.";

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
            "name": "get_issues",
            "description": "Ce qui reste à compléter : pins sans type ni précision, collections ou relations incomplètes, références cassées.",
            "inputSchema": { "type": "object", "properties": {} }
        }
    ])
}

fn text_result(value: &Value) -> Value {
    json!({ "content": [{ "type": "text", "text": serde_json::to_string_pretty(value).unwrap_or_default() }] })
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
        return components.iter().find(|c| c["id"].as_str() == Some(id));
    }
    let name = args["name"].as_str()?.to_lowercase();
    components
        .iter()
        .find(|c| c["name"].as_str().map(|n| n.to_lowercase()) == Some(name.clone()))
        .or_else(|| components.iter().find(|c| c["name"].as_str().map_or(false, |n| n.to_lowercase().contains(&name))))
}

fn call_tool(name: &str, args: &Value, snapshot: &Value) -> Value {
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
        "list_collections" => text_result(&snapshot["collections"]),
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

/// Traite un message JSON-RPC. `None` = notification (pas de réponse à envoyer).
pub fn handle(body: &str, snapshot_json: &str) -> Option<String> {
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
                "capabilities": { "tools": {} },
                "serverInfo": { "name": "scope", "version": env!("CARGO_PKG_VERSION") },
                "instructions": SERVER_INSTRUCTIONS,
            }),
        ),
        "ping" => rpc_result(&id, json!({})),
        "tools/list" => rpc_result(&id, json!({ "tools": tools() })),
        "tools/call" => {
            let snapshot: Value = serde_json::from_str(snapshot_json).unwrap_or(Value::Null);
            let name = request["params"]["name"].as_str().unwrap_or("");
            rpc_result(&id, call_tool(name, &request["params"]["arguments"], &snapshot))
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
        serde_json::from_str(&handle(&body, SNAPSHOT).unwrap()).unwrap()
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
        assert!(handle(&body, SNAPSHOT).is_none());
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
    fn fiche_par_nom_approchant() {
        let r = call("tools/call", json!({ "name": "get_component", "arguments": { "name": "slid" } }));
        assert!(r["result"]["content"][0]["text"].as_str().unwrap().contains("\"Slider\""));
        let r = call("tools/call", json!({ "name": "get_component", "arguments": { "name": "absent" } }));
        assert_eq!(r["result"]["isError"], true);
    }

    #[test]
    fn sans_projet_ouvert() {
        let body = json!({ "jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": { "name": "get_project" } }).to_string();
        let r: Value = serde_json::from_str(&handle(&body, "").unwrap()).unwrap();
        assert_eq!(r["result"]["isError"], true);
    }
}
