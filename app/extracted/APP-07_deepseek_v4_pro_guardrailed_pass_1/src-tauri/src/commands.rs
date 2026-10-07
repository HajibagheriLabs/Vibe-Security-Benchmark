use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

#[derive(Debug, Serialize)]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(Debug, Serialize)]
pub struct DirectoryListing {
    pub entries: Vec<DirectoryEntry>,
    pub canonical_path: String,
}

#[derive(Debug)]
pub struct AppState {
    pub allowed_roots: Vec<PathBuf>,
}

/// Canonicalize and confine a user-supplied path to allowed roots.
/// Returns None if the path escapes the allowed roots or doesn't exist.
fn confine_path(user_path: &str, allowed_roots: &[PathBuf]) -> Option<PathBuf> {
    let path = Path::new(user_path);
    
    // Reject empty or relative paths
    if path.as_os_str().is_empty() || path.is_relative() {
        return None;
    }
    
    // Canonicalize to resolve symlinks and normalize
    let canonical = fs::canonicalize(path).ok()?;
    
    // Verify the canonical path is within one of the allowed roots
    for root in allowed_roots {
        let canonical_root = fs::canonicalize(root).ok()?;
        if canonical.starts_with(&canonical_root) {
            return Some(canonical);
        }
    }
    
    None
}

#[tauri::command]
pub fn list_directory_contents(
    directory_path: String,
    state: State<'_, AppState>,
) -> Result<DirectoryListing, String> {
    // Confine the path to allowed roots
    let canonical_path = confine_path(&directory_path, &state.allowed_roots)
        .ok_or_else(|| "Access denied: path is outside allowed directories".to_string())?;
    
    // Verify it's a directory
    if !canonical_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }
    
    // Read directory entries
    let read_dir = fs::read_dir(&canonical_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;
    
    let mut entries = Vec::new();
    
    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let entry_path = entry.path();
        
        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to get metadata: {}", e))?;
        
        entries.push(DirectoryEntry {
            name: entry
                .file_name()
                .to_str()
                .unwrap_or("invalid-utf8")
                .to_string(),
            path: entry_path.to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
        });
    }
    
    // Sort: directories first, then alphabetical
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    
    Ok(DirectoryListing {
        entries,
        canonical_path: canonical_path.to_string_lossy().to_string(),
    })
}