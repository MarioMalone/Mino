<script lang="ts">
  import { invoke } from '@tauri-apps/api/core'

  interface FileEntry {
    name: string
    path: string
    is_dir: boolean
    children: FileEntry[] | null
  }

  let {
    visible = $bindable(false),
    onFileSelect,
  }: {
    visible: boolean
    onFileSelect: (path: string) => void
  } = $props()

  let entries: FileEntry[] = $state([])
  let rootPath = $state('')
  let expandedDirs = $state(new Set<string>())
  let loading = $state(false)
  let error = $state('')

  // Load a directory
  async function loadDirectory(dirPath: string) {
    loading = true
    error = ''
    try {
      const result = await invoke<FileEntry[]>('read_directory', { path: dirPath, depth: 1 })
      entries = result
      rootPath = dirPath
    } catch (err) {
      error = String(err)
      entries = []
    } finally {
      loading = false
    }
  }

  // Toggle directory expansion
  async function toggleDir(entry: FileEntry) {
    if (!entry.is_dir) return

    if (expandedDirs.has(entry.path)) {
      expandedDirs.delete(entry.path)
      expandedDirs = new Set(expandedDirs) // trigger reactivity
    } else {
      expandedDirs.add(entry.path)
      expandedDirs = new Set(expandedDirs)
      // Load children if not loaded
      if (entry.children === null) {
        try {
          const children = await invoke<FileEntry[]>('read_directory', { path: entry.path, depth: 1 })
          entry.children = children
          // Trigger reactivity
          entries = [...entries]
        } catch (err) {
          error = String(err)
        }
      }
    }
  }

  // Handle file click
  function handleFileClick(entry: FileEntry) {
    if (entry.is_dir) {
      toggleDir(entry)
    } else {
      onFileSelect(entry.path)
    }
  }

  // Open folder dialog
  async function openFolder() {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        directory: true,
        multiple: false,
      })
      if (selected && typeof selected === 'string') {
        await loadDirectory(selected)
      }
    } catch (err) {
      error = String(err)
    }
  }

  // Get file icon based on extension
  function getFileIcon(name: string, isDir: boolean): string {
    if (isDir) return '📁'
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    switch (ext) {
      case 'md': return '📝'
      case 'json': return '📋'
      case 'js': case 'ts': return '📜'
      case 'html': return '🌐'
      case 'css': return '🎨'
      case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': case 'webp': return '🖼️'
      case 'pdf': return '📕'
      default: return '📄'
    }
  }

  // Expose loadDirectory for external use
  export function openFolderAtPath(path: string) {
    loadDirectory(path)
  }
</script>

{#if visible}
  <div class="file-tree-panel">
    <div class="file-tree-header">
      <span class="file-tree-title">文件</span>
      <div class="file-tree-actions">
        <button class="file-tree-btn" title="打开文件夹" onclick={openFolder}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        <button class="file-tree-btn" title="关闭" onclick={() => visible = false}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    {#if rootPath}
      <div class="file-tree-root">{rootPath.split('\\').pop() ?? rootPath}</div>
    {/if}

    <div class="file-tree-list">
      {#if loading}
        <div class="file-tree-empty">加载中...</div>
      {:else if error}
        <div class="file-tree-error">{error}</div>
      {:else if entries.length === 0}
        <div class="file-tree-empty">
          {#if !rootPath}
            <button class="file-tree-open-btn" onclick={openFolder}>打开文件夹</button>
          {:else}
            文件夹为空
          {/if}
        </div>
      {:else}
        {#each entries as entry}
          <div class="file-tree-item-wrapper">
            <button
              class="file-tree-item"
              class:is-dir={entry.is_dir}
              class:is-expanded={expandedDirs.has(entry.path)}
              onclick={() => handleFileClick(entry)}
              title={entry.path}
            >
              <span class="file-tree-icon">
                {#if entry.is_dir}
                  {#if expandedDirs.has(entry.path)}
                    ▼
                  {:else}
                    ▶
                  {/if}
                {/if}
              </span>
              <span class="file-tree-emoji">{getFileIcon(entry.name, entry.is_dir)}</span>
              <span class="file-tree-name">{entry.name}</span>
            </button>

            {#if entry.is_dir && expandedDirs.has(entry.path) && entry.children}
              <div class="file-tree-children">
                {#each entry.children as child}
                  <button
                    class="file-tree-item file-tree-child"
                    class:is-dir={child.is_dir}
                    onclick={() => handleFileClick(child)}
                    title={child.path}
                  >
                    <span class="file-tree-icon">
                      {#if child.is_dir}
                        {#if expandedDirs.has(child.path)}
                          ▼
                        {:else}
                          ▶
                        {/if}
                      {/if}
                    </span>
                    <span class="file-tree-emoji">{getFileIcon(child.name, child.is_dir)}</span>
                    <span class="file-tree-name">{child.name}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style>
  .file-tree-panel {
    position: fixed;
    top: 44px;
    left: 0;
    bottom: 24px;
    width: 260px;
    z-index: 90;
    background: var(--bg-toolbar);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .file-tree-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .file-tree-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .file-tree-actions {
    display: flex;
    gap: 2px;
  }

  .file-tree-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .file-tree-btn:hover {
    background: var(--border-color);
    color: var(--text-primary);
  }

  .file-tree-root {
    padding: 6px 12px;
    font-size: 11px;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-tree-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .file-tree-empty {
    padding: 16px 12px;
    text-align: center;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .file-tree-error {
    padding: 12px;
    font-size: 12px;
    color: #d32f2f;
  }

  .file-tree-open-btn {
    padding: 6px 12px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    font-size: 13px;
    font-family: var(--font-sans);
  }

  .file-tree-open-btn:hover {
    background: var(--border-color);
  }

  .file-tree-item-wrapper {
    /* Container for item + children */
  }

  .file-tree-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 4px 8px;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    gap: 4px;
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--text-primary);
  }

  .file-tree-item:hover {
    background: var(--border-color);
  }

  .file-tree-child {
    padding-left: 24px;
  }

  .file-tree-icon {
    width: 14px;
    font-size: 10px;
    color: var(--text-secondary);
    text-align: center;
    flex-shrink: 0;
  }

  .file-tree-emoji {
    font-size: 14px;
    flex-shrink: 0;
  }

  .file-tree-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-tree-children {
    /* Indented children */
  }
</style>
