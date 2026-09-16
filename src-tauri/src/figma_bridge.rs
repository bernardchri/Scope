//! Petit serveur HTTP local utilisé par le plugin Figma pour pousser un import
//! (image + pins nommés) vers SCOPE. Écoute uniquement sur 127.0.0.1, protégé
//! par un jeton généré au démarrage de l'app (affiché dans les Paramètres).

use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tiny_http::{Header, Method, Response, StatusCode};

#[derive(Clone, Serialize)]
pub struct FigmaBridgeInfo {
    pub port: u16,
    pub token: String,
}

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

fn preflight_response() -> Response<std::io::Cursor<Vec<u8>>> {
    let methods = Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"POST, OPTIONS"[..])
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
) -> Response<std::io::Cursor<Vec<u8>>> {
    if request.method() == &Method::Options {
        return preflight_response();
    }

    if request.method() != &Method::Post || request.url() != "/scope-push" {
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
pub fn start(app: AppHandle) -> Option<FigmaBridgeInfo> {
    let token = generate_token();

    for port in CANDIDATE_PORTS {
        let server = match tiny_http::Server::http(("127.0.0.1", port)) {
            Ok(s) => s,
            Err(_) => continue,
        };

        println!("[figma_bridge] listening on http://localhost:{}/scope-push (token in Paramètres)", port);

        let token_for_thread = token.clone();
        std::thread::spawn(move || {
            for mut request in server.incoming_requests() {
                let response = handle_request(&mut request, &app, &token_for_thread);
                let _ = request.respond(response);
            }
        });

        return Some(FigmaBridgeInfo { port, token });
    }

    eprintln!("[figma_bridge] aucun port disponible parmi {:?}, pont désactivé", CANDIDATE_PORTS);
    None
}
