use std::fs;
use std::path::PathBuf;
use tauri::command;

#[derive(serde::Serialize)]
pub struct DirEntryInfo {
    name: String,
    path: String,
    is_dir: bool,
    is_file: bool,
    is_symlink: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    modified: Option<String>,
}

#[command]
pub async fn read_directory(path: String) -> Result<Vec<DirEntryInfo>, String> {
    let path_buf = PathBuf::from(&path);
    
    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    
    if !path_buf.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    
    let entries = fs::read_dir(&path_buf)
        .map_err(|e| format!("Failed to read directory: {}", e))?;
    
    let mut results = Vec::new();
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let entry_path = entry.path();
        let metadata = entry.metadata().ok();
        
        let name = entry.file_name().to_string_lossy().to_string();
        let path_str = entry_path.to_string_lossy().to_string();
        let is_dir = entry_path.is_dir();
        let is_file = entry_path.is_file();
        let is_symlink = entry.file_type().map(|ft| ft.is_symlink()).unwrap_or(false);
        let size = metadata.as_ref().and_then(|m| if m.is_file() { Some(m.len()) } else { None });
        let modified = metadata
            .as_ref()
            .and_then(|m| m.modified().ok())
            .map(|t| {
                let datetime: chrono::DateTime<chrono::Utc> = t.into();
                datetime.to_rfc3339()
            });
        
        results.push(DirEntryInfo {
            name,
            path: path_str,
            is_dir,
            is_file,
            is_symlink,
            size,
            modified,
        });
    }
    
    results.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    
    Ok(results)
}