mod sidecar;

use std::fs;
use std::path::Path;
use serde::Serialize;

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
fn copy_file(src: String, dest_dir: String) -> Result<String, String> {
    let src_path = Path::new(&src);
    let file_name = src_path
        .file_name()
        .ok_or_else(|| "Invalid source file name".to_string())?;
    let dest_dir_path = Path::new(&dest_dir);

    // Create destination directory if it doesn't exist
    fs::create_dir_all(dest_dir_path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    let dest_path = dest_dir_path.join(file_name);

    // If file already exists with same name, add a numeric suffix
    let final_path = if dest_path.exists() {
        let stem = dest_path.file_stem().unwrap_or_default().to_string_lossy();
        let ext = dest_path.extension().unwrap_or_default().to_string_lossy();
        let parent = dest_path.parent().unwrap_or(dest_dir_path);
        let mut counter = 1;
        loop {
            let new_name = if ext.is_empty() {
                format!("{}_{}", stem, counter)
            } else {
                format!("{}_{}.{}", stem, counter, ext)
            };
            let new_path = parent.join(new_name);
            if !new_path.exists() {
                break new_path;
            }
            counter += 1;
        }
    } else {
        dest_path
    };

    fs::copy(&src, &final_path)
        .map_err(|e| format!("Failed to copy file: {}", e))?;

    Ok(final_path.to_string_lossy().to_string())
}

#[derive(Serialize, Clone)]
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileEntry>>,
}

#[tauri::command]
fn read_directory(path: String, depth: Option<u32>) -> Result<Vec<FileEntry>, String> {
    let dir_path = Path::new(&path);
    if !dir_path.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }

    let max_depth = depth.unwrap_or(1);
    read_dir_recursive(dir_path, max_depth, 0)
}

fn read_dir_recursive(dir: &Path, max_depth: u32, current_depth: u32) -> Result<Vec<FileEntry>, String> {
    let entries = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut result: Vec<FileEntry> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and common non-markdown directories
        if file_name.starts_with('.') || file_name == "node_modules" || file_name == "target" {
            continue;
        }

        let file_path = entry.path();
        let is_dir = file_path.is_dir();

        let children = if is_dir && current_depth < max_depth {
            Some(read_dir_recursive(&file_path, max_depth, current_depth + 1)?)
        } else {
            None
        };

        result.push(FileEntry {
            name: file_name,
            path: file_path.to_string_lossy().to_string(),
            is_dir,
            children,
        });
    }

    // Sort: directories first, then alphabetically
    result.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(result)
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn get_file_info(path: String) -> Result<serde_json::Value, String> {
    let metadata = fs::metadata(&path)
        .map_err(|e| format!("Failed to get metadata: {}", e))?;

    Ok(serde_json::json!({
        "name": Path::new(&path).file_name().unwrap_or_default().to_string_lossy(),
        "path": path,
        "is_dir": metadata.is_dir(),
        "size": metadata.len(),
        "modified": metadata.modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0),
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_file, write_file, copy_file,
            read_directory, read_file_bytes, get_file_info,
            sidecar::check_pandoc, sidecar::get_pandoc_version,
            sidecar::export_with_pandoc, sidecar::get_export_formats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
