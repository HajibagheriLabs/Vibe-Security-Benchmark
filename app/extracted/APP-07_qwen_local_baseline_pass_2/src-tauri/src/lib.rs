use tauri::command;
use std::fs;
use std::path::PathBuf;

#[derive(serde::Serialize)]
struct FileInfo {
    name: String,
    is_dir: bool,
    size: u64,
}

#[command]
fn read_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let path_buf = PathBuf::from(&path);
    
    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if !path_buf.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let entries = fs::read_dir(&path_buf)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut files = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry.metadata().map_err(|e| format!("Failed to read metadata: {}", e))?;
        
        let file_name = entry.file_name()
            .into_string()
            .unwrap_or_else(|_| String::from("invalid_utf8"));

        files.push(FileInfo {
            name: file_name,
            is_dir: metadata.is_dir(),
            size: metadata.len(),
        });
    }

    Ok(files)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![read_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}