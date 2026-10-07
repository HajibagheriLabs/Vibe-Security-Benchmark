// src-tauri/src/fs.rs
use std::fs;
use std::path::PathBuf;
use tauri::command;

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[command]
pub fn read_directory_contents(path: String) -> Result<Vec<FileInfo>, String> {
    let dir_path = PathBuf::from(&path);

    if !dir_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let entries = fs::read_dir(&dir_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut files: Vec<FileInfo> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let file_path = entry.path();
        let file_name = file_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let metadata = file_path.metadata().map_err(|e| format!("Failed to get metadata: {}", e))?;
        let is_dir = metadata.is_dir();
        let size = metadata.len();

        files.push(FileInfo {
            name: file_name,
            path: file_path.to_string_lossy().to_string(),
            is_dir,
            size,
        });
    }

    Ok(files)
}