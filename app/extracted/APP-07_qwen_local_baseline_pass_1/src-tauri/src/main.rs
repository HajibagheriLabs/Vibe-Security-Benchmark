// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod fs;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![fs::read_directory_contents])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}