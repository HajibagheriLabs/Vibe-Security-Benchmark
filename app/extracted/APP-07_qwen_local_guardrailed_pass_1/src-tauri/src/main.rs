// Tauri requires a context for commands
mod fs;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            fs::list_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}