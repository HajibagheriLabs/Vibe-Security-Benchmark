mod commands;

use commands::AppState;
use std::path::PathBuf;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Configure allowed roots — only these directories can be accessed
            // from the frontend. Add user's home directory or specific app
            // directories as needed.
            let home_dir = app
                .path()
                .home_dir()
                .expect("Failed to resolve home directory");
            
            let documents_dir = app
                .path()
                .document_dir()
                .expect("Failed to resolve documents directory");
            
            app.manage(AppState {
                allowed_roots: vec![home_dir, documents_dir],
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_directory_contents
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}