// src-tauri/src/lib.rs
mod commands;

use commands::read_directory;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}