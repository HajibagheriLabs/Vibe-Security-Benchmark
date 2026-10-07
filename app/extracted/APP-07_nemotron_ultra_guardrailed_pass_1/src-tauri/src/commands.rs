use std::path::{Path, PathBuf};
use tauri::command;

#[command]
pub async fn read_directory(path: String) -> Result<Vec<DirectoryEntry>, String> {
    let requested = PathBuf::from(&path);
    let base_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;

    let canonical_base = base_dir
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize base directory: {}", e))?;

    let canonical_requested = requested
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize requested path: {}", e))?;

    if !canonical_requested.starts_with(&canonical_base) {
        return Err("Path traversal attempt denied".into());
    }

    if !canonical_requested.is_dir() {
        return Err("Path is not a directory".into());
    }

    let mut entries = Vec::new();
    let dir_iter = std::fs::read_dir(&canonical_requested)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in dir_iter {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        let metadata = entry.metadata().map_err(|e| format!("Failed to get metadata: {}", e))?;

        entries.push(DirectoryEntry {
            name: entry.file_name().to_string_lossy().into_owned(),
            path: path.to_string_lossy().into_owned(),
            is_dir: metadata.is_dir(),
            is_file: metadata.is_file(),
            size: metadata.len(),
            modified: metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs()),
        });
    }

    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });

    Ok(entries)
}

#[derive(serde::Serialize)]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_file: bool,
    pub size: u64,
    pub modified: Option<u64>,
}