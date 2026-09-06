mod backup;

use tauri::{menu::{Menu, MenuItem, Submenu, PredefinedMenuItem}, Manager, Emitter};
use tauri_plugin_dialog::DialogExt;
use std::path::PathBuf;

// ─── Folder-based project commands ───────────────────────────────────────────

#[tauri::command]
fn create_project_folder(folder_path: String) -> Result<(), String> {
    let root = PathBuf::from(&folder_path);
    std::fs::create_dir_all(root.join("img"))
        .map_err(|e| format!("Impossible de créer img/: {}", e))?;
    std::fs::create_dir_all(root.join("export"))
        .map_err(|e| format!("Impossible de créer export/: {}", e))?;
    // Write an empty project placeholder
    std::fs::write(root.join("scope.json"), "{}")
        .map_err(|e| format!("Erreur écriture scope.json: {}", e))?;
    Ok(())
}

#[tauri::command]
fn save_project_to_folder(folder_path: String, data: serde_json::Value) -> Result<(), String> {
    let json_path = PathBuf::from(&folder_path).join("scope.json");
    let json = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Erreur sérialisation: {}", e))?;
    std::fs::write(&json_path, json)
        .map_err(|e| format!("Erreur écriture scope.json: {}", e))?;
    Ok(())
}

#[tauri::command]
fn load_project_from_folder(folder_path: String) -> Result<serde_json::Value, String> {
    let json_path = PathBuf::from(&folder_path).join("scope.json");
    let content = std::fs::read_to_string(&json_path)
        .map_err(|e| format!("Erreur lecture scope.json: {}", e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Erreur parsing scope.json: {}", e))
}

#[tauri::command]
fn save_image_file(folder_path: String, filename: String, base64_data: String) -> Result<(), String> {
    use base64::{Engine as _, engine::general_purpose};
    let img_dir = PathBuf::from(&folder_path).join("img");
    std::fs::create_dir_all(&img_dir)
        .map_err(|e| format!("Impossible de créer img/: {}", e))?;
    // Strip data URI prefix if present
    let raw = if let Some(pos) = base64_data.find(',') {
        &base64_data[pos + 1..]
    } else {
        &base64_data
    };
    let bytes = general_purpose::STANDARD
        .decode(raw)
        .map_err(|e| format!("Erreur décodage base64: {}", e))?;
    std::fs::write(img_dir.join(&filename), bytes)
        .map_err(|e| format!("Erreur écriture image: {}", e))?;
    Ok(())
}

#[tauri::command]
fn read_image_as_base64(file_path: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose};
    let path = PathBuf::from(&file_path);
    let bytes = std::fs::read(&path)
        .map_err(|e| format!("Erreur lecture image: {}", e))?;
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        _ => "image/png",
    };
    let b64 = general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[tauri::command]
fn delete_image_file(folder_path: String, filename: String) -> Result<(), String> {
    let img_path = PathBuf::from(&folder_path).join("img").join(&filename);
    if img_path.exists() {
        std::fs::remove_file(&img_path)
            .map_err(|e| format!("Erreur suppression image: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn is_project_folder(path: String) -> Result<bool, String> {
    let scope_json = PathBuf::from(&path).join("scope.json");
    Ok(scope_json.exists())
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
fn write_pdf_file(path: String, base64_data: String) -> Result<(), String> {
    use base64::{Engine as _, engine::general_purpose};
    let bytes = general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Erreur décodage base64: {}", e))?;
    std::fs::write(&path, bytes)
        .map_err(|e| format!("Erreur écriture PDF: {}", e))
}

#[tauri::command]
#[allow(dead_code)]
fn write_binary_file(path: String, base64_data: String) -> Result<(), String> {
    use base64::{Engine as _, engine::general_purpose};
    let path_buf = std::path::PathBuf::from(&path);
    if let Some(parent) = path_buf.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Impossible de créer le dossier: {}", e))?;
    }
    let raw: &str = if let Some(pos) = base64_data.find(',') {
        &base64_data[pos + 1..]
    } else {
        &base64_data
    };
    let bytes = general_purpose::STANDARD
        .decode(raw)
        .map_err(|e| format!("Erreur décodage base64: {}", e))?;
    std::fs::write(&path_buf, bytes)
        .map_err(|e| format!("Erreur écriture fichier: {}", e))
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content.as_bytes())
        .map_err(|e| format!("Erreur écriture fichier: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Menu natif
            let open_item = MenuItem::with_id(app, "open-file", "Ouvrir un projet…", true, Some("CmdOrCtrl+O"))?;
            let close_item = MenuItem::with_id(app, "close-project", "Fermer le projet", true, Some("CmdOrCtrl+W"))?;
            let scope_menu = Submenu::with_items(app, "SCOPE", true, &[
                &open_item,
                &close_item,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::quit(app, Some("Quitter"))?,
            ])?;
            let undo_item = MenuItem::with_id(app, "undo", "Annuler", true, Some("CmdOrCtrl+Z"))?;
            let redo_item = MenuItem::with_id(app, "redo", "Rétablir", true, Some("CmdOrCtrl+Shift+Z"))?;
            let edit_menu = Submenu::with_items(app, "Édition", true, &[
                &undo_item,
                &redo_item,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::cut(app, Some("Couper"))?,
                &PredefinedMenuItem::copy(app, Some("Copier"))?,
                &PredefinedMenuItem::paste(app, Some("Coller"))?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::select_all(app, Some("Tout sélectionner"))?,
            ])?;
            let menu = Menu::with_items(app, &[&scope_menu, &edit_menu])?;
            app.set_menu(menu)?;

            let app_handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                match event.id().as_ref() {
                    "open-file" => {
                        let app_clone = app_handle.clone();
                        app_handle
                            .dialog()
                            .file()
                            .pick_folder(move |path| {
                                if let Some(path) = path {
                                    app_clone.emit("menu-open-file", path.to_string()).ok();
                                }
                            });
                    }
                    "close-project" => {
                        app_handle.emit("menu-close-project", ()).ok();
                    }
                    "undo" => {
                        app_handle.emit("menu-undo", ()).ok();
                    }
                    "redo" => {
                        app_handle.emit("menu-redo", ()).ok();
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_auto_backup,
            write_pdf_file,
            write_binary_file,
            write_text_file,
            create_project_folder,
            save_project_to_folder,
            load_project_from_folder,
            save_image_file,
            read_image_as_base64,
            delete_image_file,
            is_project_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}