//! Petit serveur HTTP local utilisé par le plugin Figma pour pousser un import
//! (image + pins nommés) vers SCOPE. Écoute uniquement sur 127.0.0.1, protégé
//! par un jeton généré au premier lancement puis conservé dans le dossier de données
//! de l'app (affiché dans les Paramètres) : le plugin Figma n'a pas à le recoller à chaque démarrage.
//!
//! Expose aussi `GET /scope-components` : la liste des composants du projet
//! ouvert (publiée par le front via `set_figma_component_catalog`), pour que
//! le plugin propose de lier une zone d'intérêt à un composant SCOPE.

use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use crate::mcp::{self, McpSnapshot};
use tauri::{AppHandle, Emitter, Manager};
use tiny_http::{Header, Method, Response, StatusCode};

#[derive(Clone, Serialize)]
pub struct FigmaBridgeInfo {
    pub port: u16,
    pub token: String,
}

/// Catalogue des composants du projet ouvert (tableau JSON sérialisé),
/// partagé entre la commande Tauri qui le met à jour et le thread du pont.
#[derive(Clone, Default)]
pub struct FigmaComponentCatalog(pub Arc<Mutex<String>>);

/// Ports candidats, dans l'ordre. Fixes (pas un port OS-assigné) pour que le
/// manifest du plugin Figma puisse les lister explicitement dans
/// `networkAccess.allowedDomains` — Figma refuse les wildcards de port et
/// les IP littérales, seul un `http://localhost:<port exact>` est accepté.
/// Plusieurs candidats en cas de port déjà pris par une autre app.
const CANDIDATE_PORTS: [u16; 5] = [51789, 51790, 51791, 51792, 51793];

/// Jeton local anti-collision, pas une protection cryptographique — suffisant
/// pour un pont qui n'écoute que sur 127.0.0.1. Concatène des sources
/// d'entropie triviales (temps, pid, compteur) plutôt que de les mélanger :
/// pas besoin de mieux pour ce niveau de garantie.
fn generate_token() -> String {
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let counter = COUNTER.fetch_add(1, Ordering::Relaxed);
    let pid = std::process::id();

    format!("{:032x}{:08x}{:016x}", nanos, pid, counter)
}

/// Jeton conservé d'un lancement à l'autre (fichier `figma_bridge_token` du dossier
/// de données de l'app, lisible par l'utilisateur seul). En cas d'erreur de lecture
/// ou d'écriture, on retombe sur un jeton éphémère : le pont reste utilisable.
fn load_or_create_token(app: &AppHandle) -> String {
    let path = match app.path().app_data_dir() {
        Ok(dir) => dir.join("figma_bridge_token"),
        Err(_) => return generate_token(),
    };
    if let Ok(existing) = std::fs::read_to_string(&path) {
        let existing = existing.trim();
        if existing.len() >= 32 {
            return existing.to_string();
        }
    }
    let token = generate_token();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if std::fs::write(&path, &token).is_ok() {
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
        }
    }
    token
}

/// Le plugin Figma appelle `fetch` depuis le sandbox principal, qui a une
/// origine "null" — sans ces en-têtes, le navigateur bloque la réponse (et
/// la requête POST avec un header Authorization déclenche un preflight
/// OPTIONS) avant même que notre code ne s'exécute, d'où un `Failed to
/// fetch` générique côté plugin.
fn cors_header() -> Header {
    Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).expect("en-tête statique valide")
}

fn text_response(body: &str, status: u16) -> Response<std::io::Cursor<Vec<u8>>> {
    let content_type = Header::from_bytes(&b"Content-Type"[..], &b"text/plain; charset=utf-8"[..])
        .expect("en-tête statique valide");
    Response::from_string(body)
        .with_status_code(StatusCode(status))
        .with_header(content_type)
        .with_header(cors_header())
}

fn json_response(body: String) -> Response<std::io::Cursor<Vec<u8>>> {
    let content_type = Header::from_bytes(&b"Content-Type"[..], &b"application/json; charset=utf-8"[..])
        .expect("en-tête statique valide");
    Response::from_string(body)
        .with_status_code(StatusCode(200))
        .with_header(content_type)
        .with_header(cors_header())
}

fn preflight_response() -> Response<std::io::Cursor<Vec<u8>>> {
    let methods = Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, POST, OPTIONS"[..])
        .expect("en-tête statique valide");
    let headers = Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type, Authorization"[..])
        .expect("en-tête statique valide");
    Response::from_string("")
        .with_status_code(StatusCode(204))
        .with_header(cors_header())
        .with_header(methods)
        .with_header(headers)
}

fn handle_request(
    request: &mut tiny_http::Request,
    app: &AppHandle,
    token: &str,
    catalog: &FigmaComponentCatalog,
    snapshot: &McpSnapshot,
) -> Response<std::io::Cursor<Vec<u8>>> {
    if request.method() == &Method::Options {
        return preflight_response();
    }

    let is_push = request.method() == &Method::Post && request.url() == "/scope-push";
    let is_catalog = request.method() == &Method::Get && request.url() == "/scope-components";
    let is_mcp = request.url() == "/mcp";
    if is_mcp && request.method() != &Method::Post {
        // Transport HTTP sans flux serveur : seul POST est servi.
        return text_response("method not allowed", 405);
    }
    let is_mcp = is_mcp && request.method() == &Method::Post;
    if !is_push && !is_catalog && !is_mcp {
        return text_response("not found", 404);
    }

    let expected = format!("Bearer {}", token);
    let authorized = request
        .headers()
        .iter()
        .any(|h| h.field.to_string().eq_ignore_ascii_case("authorization") && h.value.to_string() == expected);
    if !authorized {
        return text_response("unauthorized", 401);
    }

    if is_mcp {
        let mut body = String::new();
        if request.as_reader().read_to_string(&mut body).is_err() {
            return text_response("bad request", 400);
        }
        let snapshot_json = snapshot.0.lock().map(|s| s.clone()).unwrap_or_default();
        return match mcp::handle(&body, &snapshot_json) {
            Some(reply) => json_response(reply),
            None => text_response("", 202),
        };
    }

    if is_catalog {
        let body = catalog.0.lock().map(|c| c.clone()).unwrap_or_default();
        return json_response(if body.is_empty() { "[]".to_string() } else { body });
    }

    let mut body = String::new();
    if request.as_reader().read_to_string(&mut body).is_err() {
        return text_response("bad request", 400);
    }

    let payload: serde_json::Value = match serde_json::from_str(&body) {
        Ok(v) => v,
        Err(_) => return text_response("invalid json", 400),
    };

    app.emit("figma-import", payload).ok();

    text_response("ok", 200)
}

/// Démarre le pont sur le premier port disponible parmi `CANDIDATE_PORTS` et
/// retourne les infos de connexion. Le serveur tourne dans son propre thread
/// jusqu'à la fermeture de l'app. Retourne `None` si aucun candidat n'est
/// libre — l'app continue de fonctionner sans le pont plutôt que de planter.
pub fn start(app: AppHandle, catalog: FigmaComponentCatalog, snapshot: McpSnapshot) -> Option<FigmaBridgeInfo> {
    let token = load_or_create_token(&app);

    for port in CANDIDATE_PORTS {
        let server = match tiny_http::Server::http(("127.0.0.1", port)) {
            Ok(s) => s,
            Err(_) => continue,
        };

        println!("[figma_bridge] listening on http://localhost:{}/scope-push (token in Paramètres)", port);

        let token_for_thread = token.clone();
        let catalog_for_thread = catalog.clone();
        let snapshot_for_thread = snapshot.clone();
        std::thread::spawn(move || {
            for mut request in server.incoming_requests() {
                let response = handle_request(&mut request, &app, &token_for_thread, &catalog_for_thread, &snapshot_for_thread);
                let _ = request.respond(response);
            }
        });

        return Some(FigmaBridgeInfo { port, token });
    }

    eprintln!("[figma_bridge] aucun port disponible parmi {:?}, pont désactivé", CANDIDATE_PORTS);
    None
}
