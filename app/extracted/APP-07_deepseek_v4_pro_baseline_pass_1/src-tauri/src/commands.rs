use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirectoryContents {
    pub entries: Vec<DirectoryEntry>,
    pub total_files: usize,
    pub total_dirs: usize,
}

#[tauri::command]
pub fn read_directory(directory_path: String) -> Result<DirectoryContents, String> {
    let path = Path::new(&directory_path);

    if !path.exists() {
        return Err(format!("Path does not exist: {}", directory_path));
    }

    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", directory_path));
    }

    let mut entries = Vec::new();
    let mut total_files = 0;
    let mut total_dirs = 0;

    let read_dir = fs::read_dir(path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let entry_path = entry.path();
        let metadata = entry.metadata()
            .map_err(|e| format!("Failed to read metadata: {}", e))?;

        let is_dir = metadata.is_dir();
        if is_dir {
            total_dirs += 1;
        } else {
            total_files += 1;
        }

        entries.push(DirectoryEntry {
            name: entry.file_name()
                .to_str()
                .unwrap_or("invalid_utf8")
                .to_string(),
            path: entry_path.to_str()
                .unwrap_or("")
                .to_string(),
            is_dir,
            size: if is_dir { 0 } else { metadata.len() },
        });
    }

    // Sort: directories first, then files, alphabetically
    entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(DirectoryContents {
        entries,
        total_files,
        total_dirs,
    })
}