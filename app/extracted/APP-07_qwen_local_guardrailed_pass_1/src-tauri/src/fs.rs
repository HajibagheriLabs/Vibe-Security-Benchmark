use tauri::api::path::resolve_path;
use std::fs;
use std::path::PathBuf;

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct FileInfo {
    name: String,
    is_dir: bool,
    size: u64,
}

#[tauri::command]
pub fn list_directory(dir_path: String) -> Result<Vec<FileInfo>, String> {
    // 1. Canonicalize to resolve symlinks and `..`
    let base = resolve_path(tauri::app::api::path::home_dir(tauri::app::api::path::BaseDirectory::Home), &dir_path)
        .ok()
        .map(|p| p.canonicalize())
        .ok()
        .flatten()
        .ok_or_else(|| "Invalid directory path".to_string())?;

    // 2. Read entries
    let entries = fs::read_dir(&base)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut result = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("IO error reading entry: {}", e))?;
        let metadata = entry.metadata().map_err(|e| format!("Metadata error: {}", e))?;
        
        result.push(FileInfo {
            name: entry.file_name().to_string_lossy().into_owned(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
        });
    }

    Ok(result)
}