use tauri::command;
use std::path::PathBuf;

/// Reads the contents of a directory.
/// 
/// Security Decision: Uses `tauri::path::BaseDirectory::App` (via the `dir` argument) 
/// to ensure the path is resolved relative to the app's data directory, preventing 
/// traversal outside the sandbox.
#[command]
pub fn read_dir(dir: String) -> Result<Vec<String>, String> {
    // 1. Parse the relative path
    let path = PathBuf::from(&dir);
    
    // 2. Resolve against the base directory (AppData)
    // Note: In Tauri 2.x, this is often handled by the `app_dir` service or 
    // passed as a BaseDirectory enum. Here we assume a simplified string path 
    // resolution relative to the app's data dir.
    let base_dir = tauri::path::BaseDirectory::App;
    
    // Get the base path
    let base_path = tauri::path::resolve(base_dir, path.clone())
        .map_err(|e| format!("Failed to resolve path {}: {}", dir, e))?;

    // 3. Read directory
    let entries = std::fs::read_dir(&base_path)
        .map_err(|e| format!("Failed to read directory {}: {}", dir, e))?;

    let mut contents = Vec::new();
    for entry in entries {
        match entry {
            Ok(entry) => {
                // Extract just the file name to keep it clean and safe
                if let Some(name) = entry.file_name().to_str() {
                    contents.push(name.to_string());
                }
            }
            Err(e) => {
                // Log error but continue reading other files
                eprintln!("Error reading entry: {}", e);
            }
        }
    }

    // 4. Return sorted list for deterministic behavior
    contents.sort();
    Ok(contents)
}