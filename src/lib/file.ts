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
 * Get the directory of a file path.
 */
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
