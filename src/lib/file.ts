import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'

export async function openFileDialog(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkdn'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return typeof selected === 'string' ? selected : null
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
