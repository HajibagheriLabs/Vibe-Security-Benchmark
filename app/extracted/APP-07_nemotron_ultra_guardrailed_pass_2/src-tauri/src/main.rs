use tauri::{command, Manager, Runtime, Window};
use std::path::{Path, PathBuf};

#[derive(serde::Deserialize)]
struct ReadDirRequest {
    path: String,
}

#[derive(serde::Serialize)]
struct DirEntryInfo {
    name: String,
    is_dir: bool,
    is_file: bool,
    is_symlink: bool,
}

#[command]
fn read_directory<R: Runtime>(window: Window<R>, request: ReadDirRequest) -> Result<Vec<DirEntryInfo>, String> {
    // 1. Verify the calling window origin (defense-in-depth; Tauri already enforces same-origin)
    let label = window.label();
    if label != "main" {
        return Err("unauthorized window".into());
    }

    // 2. Parse and canonicalize the requested path
    let requested = PathBuf::from(&request.path);
    let canonical = requested.canonicalize()
        .map_err(|e| format!("invalid path: {}", e))?;

    // 3. Confine to allowed roots (mirrors allowlist scope)
    let allowed_roots: Vec<PathBuf> = [
        dirs::data_dir().map(|p| p.join("secure-fs-demo")),
        dirs::home_dir(),
    ].into_iter().flatten().collect();

    let is_allowed = allowed_roots.iter().any(|root| canonical.starts_with(root));
    if !is_allowed {
        return Err("path outside allowed scope".into());
    }

    // 4. Read directory entries
    let entries = std::fs::read_dir(&canonical)
        .map_err(|e| format!("read_dir failed: {}", e))?;

    let mut results = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("entry error: {}", e))?;
        let ft = entry.file_type().map_err(|e| format!("file_type error: {}", e))?;
        results.push(DirEntryInfo {
            name: entry.file_name().to_string_lossy().into_owned(),
            is_dir: ft.is_dir(),
            is_file: ft.is_file(),
            is_symlink: ft.is_symlink(),
        });
    }

    Ok(results)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}