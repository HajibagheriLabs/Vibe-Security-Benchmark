// src-tauri/src/commands.rs
use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_file: bool,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirectoryContents {
    pub entries: Vec<DirectoryEntry>,
    pub total_entries: usize,
    pub total_size: u64,
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
    let mut total_size = 0u64;
    
    match fs::read_dir(path) {
        Ok(read_dir) => {
            for entry in read_dir {
                match entry {
                    Ok(dir_entry) => {
                        let entry_path = dir_entry.path();
                        let metadata = match dir_entry.metadata() {
                            Ok(meta) => meta,
                            Err(e) => return Err(format!("Failed to read metadata: {}", e)),
                        };
                        
                        let name = dir_entry.file_name()
                            .to_string_lossy()
                            .to_string();
                        
                        let is_dir = metadata.is_dir();
                        let is_file = metadata.is_file();
                        let size = if is_file { metadata.len() } else { 0 };
                        
                        if is_file {
                            total_size += size;
                        }
                        
                        entries.push(DirectoryEntry {
                            name,
                            path: entry_path.to_string_lossy().to_string(),
                            is_dir,
                            is_file,
                            size,
                        });
                    }
                    Err(e) => return Err(format!("Failed to read directory entry: {}", e)),
                }
            }
        }
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    }
    
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    
    let total_entries = entries.len();
    
    Ok(DirectoryContents {
        entries,
        total_entries,
        total_size,
    })
}