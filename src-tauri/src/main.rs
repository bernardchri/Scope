mod backup;

use tauri::{menu::{Menu, MenuItem, Submenu, PredefinedMenuItem}, Manager, Emitter};
use tauri_plugin_dialog::DialogExt;
use std::path::PathBuf;

#[tauri::command]
fn export_to_file(
    data: serde_json::Value,
    path: String,
) -> Result<(), String> {
    let path_buf = PathBuf::from(path);
    backup::export_to_scope_file(data, path_buf)
}

#[tauri::command]
fn import_from_file(
    path: String,
) -> Result<serde_json::Value, String> {
    let path_buf = PathBuf::from(path);
    backup::import_from_scope_file(path_buf)
}

#[tauri::command]
fn create_auto_backup(
    app: tauri::AppHandle,
    data: serde_json::Value,
) -> Result<(), String> {
    let backup_dir = app.path()
        .app_data_dir()
        .map_err(|e| format!("Impossible de trouver le dossier: {}", e))?
        .join("backups");

    backup::create_auto_backup(data, backup_dir)
}

#[tauri::command]
fn save_project_file(path: String, data: serde_json::Value) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    if let Some(parent) = path_buf.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Impossible de créer le dossier: {}", e))?;
    }
    let json = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Erreur sérialisation: {}", e))?;
    std::fs::write(&path_buf, json)
        .map_err(|e| format!("Erreur écriture fichier: {}", e))?;
    Ok(())
}

#[tauri::command]
fn load_project_file(path: String) -> Result<serde_json::Value, String> {
    let path_buf = PathBuf::from(&path);

    // Essayer JSON plain en premier (nouveau format)
    if let Ok(content) = std::fs::read_to_string(&path_buf) {
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(&content) {
            return Ok(value);
        }
    }

    // Fallback : format gzip (anciens exports/backups)
    backup::import_from_scope_file(path_buf)
}

#[tauri::command]
fn list_scope_files(dir: String) -> Result<Vec<String>, String> {
    let dir_path = PathBuf::from(&dir);
    if !dir_path.exists() {
        return Ok(vec![]);
    }
    let entries = std::fs::read_dir(&dir_path)
        .map_err(|e| format!("Erreur lecture dossier: {}", e))?;
    let mut files = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Erreur entrée: {}", e))?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("scope") {
            if let Some(path_str) = path.to_str() {
                files.push(path_str.to_string());
            }
        }
    }
    Ok(files)
}

#[tauri::command]
fn delete_project_file(path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    if path_buf.exists() {
        std::fs::remove_file(&path_buf)
            .map_err(|e| format!("Erreur suppression fichier: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn write_pdf_file(path: String, base64_data: String) -> Result<(), String> {
    use base64::{Engine as _, engine::general_purpose};
    let bytes = general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Erreur décodage base64: {}", e))?;
    std::fs::write(&path, bytes)
        .map_err(|e| format!("Erreur écriture PDF: {}", e))
}

#[tauri::command]
fn rename_project_file(old_path: String, new_path: String) -> Result<(), String> {
    let old_buf = PathBuf::from(&old_path);
    let new_buf = PathBuf::from(&new_path);
    if old_buf.exists() {
        std::fs::rename(&old_buf, &new_buf)
            .map_err(|e| format!("Erreur renommage fichier: {}", e))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Menu natif : Fichier > Ouvrir un fichier…
            let open_item = MenuItem::with_id(app, "open-file", "Ouvrir un fichier…", true, Some("CmdOrCtrl+O"))?;
            let file_menu = Submenu::with_items(app, "Fichier", true, &[
                &open_item,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::quit(app, Some("Quitter"))?,
            ])?;
            let menu = Menu::with_items(app, &[&file_menu])?;
            app.set_menu(menu)?;

            let app_handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                if event.id() == "open-file" {
                    let app_clone = app_handle.clone();
                    app_handle
                        .dialog()
                        .file()
                        .add_filter("SCOPE Files", &["scope"])
                        .pick_file(move |path| {
                            if let Some(path) = path {
                                let path_str = path.to_string();
                                app_clone.emit("menu-open-file", path_str).ok();
                            }
                        });
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            export_to_file,
            import_from_file,
            create_auto_backup,
            save_project_file,
            load_project_file,
            list_scope_files,
            delete_project_file,
            rename_project_file,
            write_pdf_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}