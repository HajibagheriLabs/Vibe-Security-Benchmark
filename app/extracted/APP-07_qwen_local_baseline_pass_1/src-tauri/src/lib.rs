// src-tauri/src/lib.rs
mod fs;

#[cfg_attr(desktop, tauri::mobile_export)]
#[cfg_attr(desktop, tauri::command)]
pub fn read_directory_contents(path: String) -> Result<fs::FileInfo, String> {
    // This file acts as the main entry point for the library if main.rs is not used
    // or for mobile exports. In a standard desktop setup, main.rs is the entry.
    fs::read_directory_contents(path)
}