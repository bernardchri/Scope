use flate2::Compression;
use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use chrono::Local;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct ScopeFile {
    pub version: String,
    pub exported_at: String,
    pub app_version: String,
    pub data: serde_json::Value,
}

/// Exporter les projets vers un fichier .scope compressé
pub fn export_to_scope_file(data: serde_json::Value, path: PathBuf) -> Result<(), String> {
    let scope_file = ScopeFile {
        version: "1.0".to_string(),
        exported_at: Local::now().to_rfc3339(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        data,
    };

    let json = serde_json::to_string(&scope_file)
        .map_err(|e| format!("Erreur de sérialisation: {}", e))?;

    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(json.as_bytes())
        .map_err(|e| format!("Erreur de compression: {}", e))?;
    
    let compressed = encoder.finish()
        .map_err(|e| format!("Erreur de finalisation: {}", e))?;

    fs::write(&path, compressed)
        .map_err(|e| format!("Erreur d'écriture: {}", e))?;

    Ok(())
}

/// Importer les projets depuis un fichier .scope compressé
pub fn import_from_scope_file(path: PathBuf) -> Result<serde_json::Value, String> {
    let compressed = fs::read(&path)
        .map_err(|e| format!("Erreur de lecture: {}", e))?;

    let mut decoder = GzDecoder::new(&compressed[..]);
    let mut json = String::new();
    decoder.read_to_string(&mut json)
        .map_err(|e| format!("Erreur de décompression: {}", e))?;

    let scope_file: ScopeFile = serde_json::from_str(&json)
        .map_err(|e| format!("Erreur de désérialisation: {}", e))?;

    // Vérifier la version (optionnel)
    if scope_file.version != "1.0" {
        return Err(format!("Version incompatible: {}", scope_file.version));
    }

    Ok(scope_file.data)
}

/// Créer un backup automatique
pub fn create_auto_backup(data: serde_json::Value, backup_dir: PathBuf) -> Result<(), String> {
    // Créer le dossier s'il n'existe pas
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Impossible de créer le dossier: {}", e))?;

    // Nom du fichier avec la date
    let date = Local::now().format("%Y-%m-%d").to_string();
    let filename = format!("backup-{}.scope", date);
    let backup_path = backup_dir.join(filename);

    // Exporter
    export_to_scope_file(data, backup_path)?;

    // Nettoyer les vieux backups (garder les 10 plus récents)
    cleanup_old_backups(&backup_dir, 10)?;

    Ok(())
}

/// Supprimer les backups au-delà de la limite
fn cleanup_old_backups(backup_dir: &PathBuf, max_backups: usize) -> Result<(), String> {
    let mut backups: Vec<_> = fs::read_dir(backup_dir)
        .map_err(|e| format!("Erreur de lecture du dossier: {}", e))?
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.path().extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext == "scope")
                .unwrap_or(false)
        })
        .collect();

    // Trier par date de modification (plus récent en premier)
    backups.sort_by_key(|entry| {
        entry.metadata()
            .and_then(|m| m.modified())
            .ok()
    });
    backups.reverse();

    // Supprimer les plus vieux
    for old_backup in backups.iter().skip(max_backups) {
        fs::remove_file(old_backup.path())
            .map_err(|e| format!("Erreur de suppression: {}", e))?;
    }

    Ok(())
}