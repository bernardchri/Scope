mod backup;

use tauri::Manager;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())  // 🆕
        .invoke_handler(tauri::generate_handler![
            export_to_file,
            import_from_file,
            create_auto_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}