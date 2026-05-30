use std::fs;
use std::path::Path;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_file, write_file, copy_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
