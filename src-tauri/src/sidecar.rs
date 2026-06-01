use std::path::PathBuf;
use std::process::Command;
use tauri::command;

/// Get the path where Pandoc should be stored
fn get_pandoc_dir() -> PathBuf {
    let mut path = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("mino");
    path.push("pandoc");
    path
}

/// Get the path to the Pandoc executable
fn get_pandoc_path() -> PathBuf {
    let mut path = get_pandoc_dir();
    path.push("pandoc.exe");
    path
}

/// Check if Pandoc is installed
#[command]
pub fn check_pandoc() -> Result<bool, String> {
    let pandoc_path = get_pandoc_path();
    if pandoc_path.exists() {
        return Ok(true);
    }

    // Also check if pandoc is in PATH
    match Command::new("pandoc").arg("--version").output() {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Get Pandoc version
#[command]
pub fn get_pandoc_version() -> Result<String, String> {
    let output = Command::new("pandoc")
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to run pandoc: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let first_line = stdout.lines().next().unwrap_or("unknown");
    Ok(first_line.to_string())
}

/// Export markdown to a target format using Pandoc
#[command]
pub fn export_with_pandoc(
    input_path: String,
    output_path: String,
    format: String,
) -> Result<String, String> {
    let input = PathBuf::from(&input_path);
    if !input.exists() {
        return Err(format!("Input file not found: {}", input_path));
    }

    // Try local pandoc first, then system pandoc
    let pandoc_path = get_pandoc_path();
    let pandoc_cmd = if pandoc_path.exists() {
        pandoc_path.to_string_lossy().to_string()
    } else {
        "pandoc".to_string()
    };

    let output = Command::new(&pandoc_cmd)
        .arg(&input_path)
        .arg("-o")
        .arg(&output_path)
        .arg("--from")
        .arg("markdown")
        .arg("--to")
        .arg(&format)
        .output()
        .map_err(|e| format!("Failed to run pandoc: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Pandoc error: {}", stderr));
    }

    Ok(output_path)
}

/// Get supported export formats
#[command]
pub fn get_export_formats() -> Vec<serde_json::Value> {
    vec![
        serde_json::json!({ "id": "docx", "name": "Word (.docx)", "ext": "docx" }),
        serde_json::json!({ "id": "html", "name": "HTML (.html)", "ext": "html" }),
        serde_json::json!({ "id": "pdf", "name": "PDF (.pdf)", "ext": "pdf" }),
        serde_json::json!({ "id": "latex", "name": "LaTeX (.tex)", "ext": "tex" }),
        serde_json::json!({ "id": "rst", "name": "reStructuredText (.rst)", "ext": "rst" }),
        serde_json::json!({ "id": "epub", "name": "EPUB (.epub)", "ext": "epub" }),
    ]
}
