import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'

export async function openFileDialog(): Promise<string | null> {
  try {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (selected === null || selected === undefined) return null
    return typeof selected === 'string' ? selected : null
  } catch (err) {
    console.error('openFileDialog error:', err)
    throw err
  }
}

export async function saveFileDialog(defaultPath?: string): Promise<string | null> {
  const selected = await save({
    defaultPath,
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return selected ?? null
}

export async function readFileContent(path: string): Promise<string> {
  return await invoke('read_file', { path })
}

export async function writeFileContent(path: string, content: string): Promise<void> {
  await invoke('write_file', { path, content })
}

export async function copyFile(src: string, destDir: string): Promise<string> {
  return await invoke('copy_file', { src, destDir })
}

/**
 * Check if WebView2 runtime is installed on the system.
 * Returns { installed: boolean, version: string | null }
 */
export async function checkWebView2(): Promise<{ installed: boolean; version: string | null }> {
  return await invoke('check_webview2')
}

/**
 * Get the directory of a file path.
 */

/**
 * Get command-line arguments (for file association).
 * When user double-clicks a .md file, the path is passed as a CLI arg.
 */
export async function getArgs(): Promise<string[]> {
  return await invoke('get_args')
}

/**
 * Extract a .md file path from CLI arguments.
 * Returns the path if found, null otherwise.
 */
export function extractMdPathFromArgs(args: string[]): string | null {
  for (const arg of args) {
    // Skip flags and the executable path
    if (arg.startsWith('-') || arg.startsWith('--')) continue
    // Check if it's a .md file
    if (arg.toLowerCase().endsWith('.md')) {
      return arg
    }
  }
  return null
}
export function getDirectory(filePath: string): string {
  const parts = filePath.replace(/\//g, '\\').split('\\')
  parts.pop()
  return parts.join('\\')
}

/**
 * Get a relative path from a base directory to a target file.
 */
export function getRelativePath(baseDir: string, targetPath: string): string {
  const normalize = (p: string) => p.replace(/\//g, '\\')
  const base = normalize(baseDir).split('\\')
  const target = normalize(targetPath).split('\\')

  // Find common prefix
  let i = 0
  while (i < base.length && i < target.length && base[i].toLowerCase() === target[i].toLowerCase()) {
    i++
  }

  // Build relative path
  const ups = base.length - i
  const rest = target.slice(i)
  const prefix = Array(ups).fill('..').join('\\')
  return prefix ? `${prefix}\\${rest.join('\\')}` : rest.join('\\')
}
