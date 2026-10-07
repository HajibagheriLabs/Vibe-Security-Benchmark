// src-tauri/src/commands.rs
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::command;

#[derive(Serialize)]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
}

#[command]
pub async fn list_directory_contents(
    dir_path: String,
    app_handle: tauri::AppHandle,
) -> Result<Vec<DirectoryEntry>, String> {
    // Canonicalize and confine the path to prevent traversal attacks
    let path = PathBuf::from(&dir_path);
    
    // Resolve the path to its canonical form (resolves symlinks, normalizes ..)
    let canonical_path = fs::canonicalize(&path)
        .map_err(|e| format!("Failed to resolve path: {}", e))?;
    
    // Get the app's data directory as the confinement boundary
    let app_data_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "Failed to resolve app data directory".to_string())?;
    
    // Ensure the requested path is within the app's data directory
    if !canonical_path.starts_with(&app_data_dir) {
        return Err("Access denied: path is outside the allowed directory".to_string());
    }
    
    // Verify it's actually a directory
    if !canonical_path.is_dir() {
        return Err("The specified path is not a directory".to_string());
    }
    
    // Read directory contents
    let entries = fs::read_dir(&canonical_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;
    
    let mut result = Vec::new();
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let entry_path = entry.path();
        
        // Get metadata
        let metadata = fs::metadata(&entry_path)
            .map_err(|e| format!("Failed to get metadata: {}", e))?;
        
        let is_dir = metadata.is_dir();
        let size = if is_dir { None } else { Some(metadata.len()) };
        
        result.push(DirectoryEntry {
            name: entry.file_name()
                .to_str()
                .ok_or_else(|| "Invalid filename encoding".to_string())?
                .to_string(),
            path: entry_path.to_string_lossy().to_string(),
            is_dir,
            size,
        });
    }
    
    // Sort: directories first, then files, alphabetically
    result.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });
    
    Ok(result)
}