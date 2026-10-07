mod fs;

#[cfg_attr(mobile, tauri::mobile_bundle)]
#[tauri::command_handler]
fn handler() -> tauri::AppHandle {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![fs::read_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    
    // Placeholder to satisfy return type if used in a specific harness context
    // In standard Tauri apps, run() is blocking, so this line is unreachable.
    std::process::exit(0);
}

#[cfg(not(mobile))]
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![fs::read_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}