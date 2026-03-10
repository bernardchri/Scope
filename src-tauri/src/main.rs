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
fn migrate_scope_to_folder(scope_path: String, folder_path: String) -> Result<serde_json::Value, String> {
    use base64::{Engine as _, engine::general_purpose};

    // Load the .scope file (try JSON first, then gzip)
    let data = load_project_file(scope_path)?;

    // Create folder structure
    let root = PathBuf::from(&folder_path);
    std::fs::create_dir_all(root.join("img"))
        .map_err(|e| format!("Impossible de créer img/: {}", e))?;
    std::fs::create_dir_all(root.join("export"))
        .map_err(|e| format!("Impossible de créer export/: {}", e))?;

    // Process the project data — extract base64 images to files
    let mut project = data.clone();
    if let Some(components) = project.get_mut("components").and_then(|c| c.as_array_mut()) {
        for component in components.iter_mut() {
            if let Some(images) = component.get_mut("images").and_then(|i| i.as_array_mut()) {
                for image in images.iter_mut() {
                    if let Some(base64_str) = image.get("base64").and_then(|b| b.as_str()) {
                        if !base64_str.is_empty() {
                            // Determine extension from data URI
                            let (ext, raw) = if let Some(pos) = base64_str.find(',') {
                                let header = &base64_str[..pos];
                                let extension = if header.contains("jpeg") || header.contains("jpg") {
                                    "jpg"
                                } else if header.contains("gif") {
                                    "gif"
                                } else if header.contains("webp") {
                                    "webp"
                                } else {
                                    "png"
                                };
                                (extension, &base64_str[pos + 1..])
                            } else {
                                ("png", base64_str)
                            };

                            // Generate filename from image id
                            let id = image.get("id")
                                .and_then(|i| i.as_str())
                                .unwrap_or("unknown");
                            let filename = format!("{}.{}", id, ext);

                            // Decode and write file
                            if let Ok(bytes) = general_purpose::STANDARD.decode(raw) {
                                let img_path = root.join("img").join(&filename);
                                let _ = std::fs::write(&img_path, bytes);
                            }

                            // Replace base64 with filename in JSON
                            if let Some(obj) = image.as_object_mut() {
                                obj.remove("base64");
                                obj.insert("filename".to_string(), serde_json::Value::String(filename));
                            }
                        }
                    }
                }
            }
            // Also handle legacy imageBase64 field
            if let Some(obj) = component.as_object_mut() {
                obj.remove("imageBase64");
            }
        }
    }

    // Set format version
    if let Some(obj) = project.as_object_mut() {
        obj.insert("formatVersion".to_string(), serde_json::Value::Number(2.into()));
    }

    // Write scope.json (without base64 data)
    let json = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("Erreur sérialisation: {}", e))?;
    std::fs::write(root.join("scope.json"), json)
        .map_err(|e| format!("Erreur écriture scope.json: {}", e))?;

    Ok(project)
}

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
            // Menu natif
            let open_item = MenuItem::with_id(app, "open-file", "Ouvrir un projet…", true, Some("CmdOrCtrl+O"))?;
            let close_item = MenuItem::with_id(app, "close-project", "Fermer le projet", true, Some("CmdOrCtrl+W"))?;
            let scope_menu = Submenu::with_items(app, "SCOPE", true, &[
                &open_item,
                &close_item,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::quit(app, Some("Quitter"))?,
            ])?;
            let edit_menu = Submenu::with_items(app, "Édition", true, &[
                &PredefinedMenuItem::undo(app, Some("Annuler"))?,
                &PredefinedMenuItem::redo(app, Some("Rétablir"))?,
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
                    _ => {}
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
            write_pdf_file,
            write_binary_file,
            write_text_file,
            create_project_folder,
            save_project_to_folder,
            load_project_from_folder,
            save_image_file,
            read_image_as_base64,
            delete_image_file,
            is_project_folder,
            migrate_scope_to_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}