<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { createEditor, getEditorMarkdown, destroyEditor } from '$lib/editor'
  import { openFileDialog, saveFileDialog, readFileContent, writeFileContent } from '$lib/file'
  import '../styles/themes.css'

  let editorContainer: HTMLDivElement
  let currentFilePath: string | null = $state(null)
  let isModified = $state(false)
  let theme: 'light' | 'dark' = $state('light')
  let statusText = $state('就绪')

  const defaultContent = `# 欢迎使用 Mino

一款极致轻量的 Markdown 即时预览编辑器。

## 功能特性

- **即时预览** — 输入 Markdown 语法，即刻看到排版效果
- **GFM 支持** — 表格、任务列表、删除线等 GitHub 扩展语法
- **轻量极速** — 基于 Tauri v2，秒开不卡顿

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| Ctrl+B | 加粗 |
| Ctrl+I | 斜体 |
| Ctrl+S | 保存 |

## 任务列表

- [x] 项目初始化
- [ ] 添加更多功能

> 开始写作吧！
`

  onMount(async () => {
    // Detect system theme preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    theme = prefersDark ? 'dark' : 'light'
    applyTheme()

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      theme = e.matches ? 'dark' : 'light'
      applyTheme()
    })

    // Create editor
    await createEditor(editorContainer, defaultContent)

    // Register keyboard shortcuts
    window.addEventListener('keydown', handleKeydown)
  })

  onDestroy(async () => {
    window.removeEventListener('keydown', handleKeydown)
    await destroyEditor()
  })

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme)
  }

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light'
    applyTheme()
  }

  async function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault()
          await handleSave()
          break
        case 'o':
          e.preventDefault()
          await handleOpen()
          break
      }
    }
  }

  async function handleOpen() {
    try {
      const path = await openFileDialog()
      if (!path) return

      statusText = '正在打开...'
      const content = await readFileContent(path)
      currentFilePath = path
      isModified = false
      statusText = `已加载: ${path.split('\\').pop()}`

      // Re-create editor with new content
      await destroyEditor()
      await createEditor(editorContainer, content)
    } catch (err) {
      statusText = `打开失败: ${err}`
    }
  }

  async function handleSave() {
    try {
      const content = getEditorMarkdown()

      if (!currentFilePath) {
        const path = await saveFileDialog()
        if (!path) return
        currentFilePath = path
      }

      statusText = '正在保存...'
      await writeFileContent(currentFilePath, content)
      isModified = false
      statusText = `已保存: ${currentFilePath.split('\\').pop()}`
    } catch (err) {
      statusText = `保存失败: ${err}`
    }
  }

  function handleNew() {
    currentFilePath = null
    isModified = false
    statusText = '新建文件'
    destroyEditor().then(() => {
      createEditor(editorContainer, '# 新文档\n\n开始写作...')
    })
  }

  function getFileName(): string {
    if (!currentFilePath) return isModified ? '* 新文档' : '新文档'
    const name = currentFilePath.split('\\').pop() ?? ''
    return isModified ? `* ${name}` : name
  }
</script>

<div class="app-container">
  <!-- Toolbar -->
  <div class="toolbar">
    <button class="toolbar-btn" title="新建 (Ctrl+N)" onclick={handleNew}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    </button>
    <button class="toolbar-btn" title="打开 (Ctrl+O)" onclick={handleOpen}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
    <button class="toolbar-btn" title="保存 (Ctrl+S)" onclick={handleSave}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
    </button>

    <div class="toolbar-separator"></div>

    <span class="toolbar-title">{getFileName()}</span>

    <div class="toolbar-separator"></div>

    <button class="toolbar-btn" title="切换主题" onclick={toggleTheme}>
      {#if theme === 'light'}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      {/if}
    </button>
  </div>

  <!-- Editor Area -->
  <div class="editor-wrapper">
    <div class="editor-content" bind:this={editorContainer}></div>
  </div>

  <!-- Status Bar -->
  <div class="status-bar">
    <span>{statusText}</span>
    <span>{theme === 'dark' ? '暗色' : '亮色'}模式</span>
  </div>
</div>
