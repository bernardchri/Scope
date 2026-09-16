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

/// Jeton local anti-collision, pas une protection cryptographique — suffisant
/// pour un pont qui n'écoute que sur 127.0.0.1.
fn generate_token() -> String {
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0);
    let counter = COUNTER.fetch_add(1, Ordering::Relaxed);
    let pid = std::process::id() as u64;

    let mut state = nanos ^ pid.wrapping_mul(0x9E37_79B9_7F4A_7C15) ^ counter;
    let mut bytes = [0u8; 24];
    for chunk in bytes.chunks_mut(8) {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        chunk.copy_from_slice(&state.to_le_bytes()[..chunk.len()]);
    }
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

fn text_response(body: &str, status: u16) -> Response<std::io::Cursor<Vec<u8>>> {
    let header = Header::from_bytes(&b"Content-Type"[..], &b"text/plain; charset=utf-8"[..])
        .expect("en-tête statique valide");
    Response::from_string(body)
        .with_status_code(StatusCode(status))
        .with_header(header)
}

fn handle_request(
    request: &mut tiny_http::Request,
    app: &AppHandle,
    token: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    if request.method() != &Method::Post || request.url() != "/import-figma" {
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

/// Démarre le pont sur un port local libre et retourne les infos de connexion.
/// Le serveur tourne dans son propre thread jusqu'à la fermeture de l'app.
pub fn start(app: AppHandle) -> Result<FigmaBridgeInfo, String> {
    let token = generate_token();
    let server = tiny_http::Server::http("127.0.0.1:0")
        .map_err(|e| format!("Impossible de démarrer le pont Figma: {}", e))?;
    let port = server
        .server_addr()
        .to_ip()
        .map(|addr| addr.port())
        .ok_or_else(|| "Impossible de déterminer le port du pont Figma".to_string())?;

    println!("[figma_bridge] listening on http://127.0.0.1:{}/import-figma (token in Paramètres)", port);

    let token_for_thread = token.clone();
    std::thread::spawn(move || {
        for mut request in server.incoming_requests() {
            let response = handle_request(&mut request, &app, &token_for_thread);
            let _ = request.respond(response);
        }
    });

    Ok(FigmaBridgeInfo { port, token })
}
