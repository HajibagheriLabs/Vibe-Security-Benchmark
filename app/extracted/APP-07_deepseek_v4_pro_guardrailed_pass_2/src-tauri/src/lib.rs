// src-tauri/src/lib.rs
mod commands;

use commands::list_directory_contents;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![list_directory_contents])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}