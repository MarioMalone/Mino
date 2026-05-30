<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte'
  import { createEditor, getEditorMarkdown, destroyEditor, toggleBold, toggleItalic, toggleCode, toggleStrikethrough, onEditorChange, offEditorChange, insertTextAtCursor } from '$lib/editor'
  import { openFileDialog, saveFileDialog, readFileContent, writeFileContent, copyFile, getDirectory, getRelativePath } from '$lib/file'
  import SearchBar from '$lib/SearchBar.svelte'
  import OutlinePanel from '$lib/OutlinePanel.svelte'
  import '../styles/themes.css'

  let editorContainer: HTMLDivElement
  let sourceTextarea: HTMLTextAreaElement
  let currentFilePath: string | null = $state(null)
  let isModified = $state(false)
  let theme: 'light' | 'dark' = $state('light')
  let statusText = $state('就绪')

  // Source mode state
  let isSourceMode = $state(false)
  let sourceContent = $state('')

  // Auto-save state
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  const AUTO_SAVE_INTERVAL = 30_000 // 30 seconds

  // Search state
  let showSearch = $state(false)
  // Outline state
  let showOutline = $state(false)

  const defaultContent = `# 欢迎使用 Mino / Welcome to Mino

开始写下你的想法吧！

Start writing your thoughts here!

## 快捷键 / Shortcuts

| 快捷键 | 功能 |
| --- | --- |
| Ctrl+B | 加粗 Bold |
| Ctrl+I | 斜体 Italic |
| Ctrl+S | 保存 Save |
| Ctrl+F | 搜索 Find |
| Ctrl+/ | 源码模式 Source Mode |
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
    console.log('[Mino] onMount starting, editorContainer:', editorContainer)
    await initEditor(defaultContent)

    // Debug: check what's in the DOM
    setTimeout(() => {
      const wrapper = document.querySelector('.editor-wrapper')
      const content = document.querySelector('.editor-content')
      const milkdown = document.querySelector('.milkdown')
      console.log('[Mino] DOM check - wrapper:', wrapper, 'content:', content, 'milkdown:', milkdown)
      if (milkdown) {
        console.log('[Mino] Milkdown innerHTML length:', milkdown.innerHTML.length)
        console.log('[Mino] Milkdown first 200 chars:', milkdown.innerHTML.substring(0, 200))
      }
    }, 1000)

    // Register keyboard shortcuts
    window.addEventListener('keydown', handleKeydown)
    // Blur listener for focus-loss auto-save
    window.addEventListener('blur', handleBlur)
  })

  /** Create editor and register change tracking */
  async function initEditor(content: string) {
    await tick() // Ensure DOM is ready (editorContainer binding updated)
    console.log('[Mino] initEditor called, editorContainer:', editorContainer)
    if (!editorContainer) {
      console.error('[Mino] editorContainer not available!')
      return
    }
    console.log('[Mino] Container dimensions:', editorContainer.offsetWidth, 'x', editorContainer.offsetHeight)
    console.log('[Mino] Container parent:', editorContainer.parentElement)
    await createEditor(editorContainer, content)
    console.log('[Mino] Editor created, container innerHTML length:', editorContainer.innerHTML.length)
    console.log('[Mino] Milkdown div:', editorContainer.querySelector('.milkdown'))
    onEditorChange(() => {
      isModified = true
    })
  }

  onDestroy(async () => {
    stopAutoSave()
    offEditorChange()
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('blur', handleBlur)
    await destroyEditor()
  })

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme)
  }

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light'
    applyTheme()
  }

  // ===== Auto-save =====

  function startAutoSave() {
    stopAutoSave()
    autoSaveTimer = setInterval(async () => {
      if (currentFilePath && isModified) {
        await doSave()
      }
    }, AUTO_SAVE_INTERVAL)
  }

  function stopAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
  }

  function resetAutoSave() {
    stopAutoSave()
    startAutoSave()
  }

  async function handleBlur() {
    if (currentFilePath && isModified) {
      await doSave()
    }
  }

  // ===== Image Handling =====

  const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico']

  function isImageFile(path: string): boolean {
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    return IMAGE_EXTENSIONS.includes(ext)
  }

  async function handleImageDrop(e: DragEvent) {
    e.preventDefault()
    if (!e.dataTransfer) return

    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      // Check if it's an image by file name
      const name = file.name.toLowerCase()
      const isImg = IMAGE_EXTENSIONS.some(ext => name.endsWith(`.${ext}`))
      if (!isImg) continue

      // Get file path from the file object (Tauri exposes webkitRelativePath)
      // For Tauri, we need to handle this differently - use the native file path
      await insertImageFromFile(file)
    }
  }

  async function handleImagePaste(e: ClipboardEvent) {
    if (!e.clipboardData) return
    const items = Array.from(e.clipboardData.items)
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file && file.type.startsWith('image/')) {
          e.preventDefault()
          await insertImageFromFile(file)
          return
        }
      }
    }
  }

  async function insertImageFromFile(file: File) {
    try {
      if (currentFilePath) {
        // Save file to disk first, then copy to images directory
        const destDir = getDirectory(currentFilePath) + '\\images'
        // For now, use data URL approach since Tauri File API doesn't expose native paths easily
        // In a real Tauri app, we'd use the native file dialog path
        const reader = new FileReader()
        reader.onload = async () => {
          const dataUrl = reader.result as string
          insertTextAtCursor(`![${file.name}](${dataUrl})`)
          isModified = true
          statusText = `已插入图片: ${file.name}`
        }
        reader.readAsDataURL(file)
      } else {
        // No file path - use data URL
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          insertTextAtCursor(`![${file.name}](${dataUrl})`)
          isModified = true
          statusText = `已插入图片: ${file.name}`
        }
        reader.readAsDataURL(file)
      }
    } catch (err) {
      statusText = `图片插入失败: ${err}`
    }
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
        case 'f':
          e.preventDefault()
          showSearch = true
          break
        case 'h':
          e.preventDefault()
          showSearch = true
          break
        case 'b':
          e.preventDefault()
          toggleBold()
          break
        case 'i':
          e.preventDefault()
          toggleItalic()
          break
        case '`':
          e.preventDefault()
          toggleCode()
          break
        case '/':
          e.preventDefault()
          await toggleSourceMode()
          break
      }
    }
    // Alt+Shift+5 for strikethrough
    if (e.altKey && e.shiftKey && e.key === '5') {
      e.preventDefault()
      toggleStrikethrough()
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
      await initEditor(content)
      startAutoSave()
    } catch (err) {
      statusText = `打开失败: ${err}`
    }
  }

  async function doSave(): Promise<boolean> {
    if (!currentFilePath) return false
    try {
      const content = isSourceMode ? sourceContent : getEditorMarkdown()
      await writeFileContent(currentFilePath, content)
      isModified = false
      statusText = `已保存: ${currentFilePath.split('\\').pop()}`
      return true
    } catch (err) {
      statusText = `保存失败: ${err}`
      return false
    }
  }

  async function handleSave() {
    try {
      if (!currentFilePath) {
        const path = await saveFileDialog()
        if (!path) return
        currentFilePath = path
      }

      statusText = '正在保存...'
      await doSave()
      resetAutoSave()
    } catch (err) {
      statusText = `保存失败: ${err}`
    }
  }

  async function handleNew() {
    stopAutoSave()
    currentFilePath = null
    isModified = false
    statusText = '新建文件'
    await destroyEditor()
    await initEditor('# 新文档\n\n开始写下你的想法吧！\n\nStart writing your thoughts here!\n')
  }

  // ===== Source Mode Toggle =====

  async function toggleSourceMode() {
    if (isSourceMode) {
      // Save current source content before switching
      const content = sourceContent || '# 新文档\n\n开始写下你的想法吧！\n\nStart writing your thoughts here!\n'
      isSourceMode = false
      await destroyEditor()
      await initEditor(content)
      isModified = true
      statusText = '切换到即时预览'
    } else {
      // Capture current editor content before destroying
      const md = getEditorMarkdown()
      sourceContent = md || ''
      await destroyEditor()
      isSourceMode = true
      isModified = true
      statusText = '切换到源码模式'
    }
  }

  function getFileName(): string {
    if (!currentFilePath) return isModified ? '* 新文档' : '新文档'
    const name = currentFilePath.split('\\').pop() ?? ''
    return isModified ? `* ${name}` : name
  }
</script>

<SearchBar bind:visible={showSearch} />
<OutlinePanel bind:visible={showOutline} />

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

    <button class="toolbar-btn" title="加粗 (Ctrl+B)" onclick={toggleBold}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
      </svg>
    </button>
    <button class="toolbar-btn" title="斜体 (Ctrl+I)" onclick={toggleItalic}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="19" y1="4" x2="10" y2="4"/>
        <line x1="14" y1="20" x2="5" y2="20"/>
        <line x1="15" y1="4" x2="9" y2="20"/>
      </svg>
    </button>
    <button class="toolbar-btn" title="行内代码 (Ctrl+`)" onclick={toggleCode}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    </button>
    <button class="toolbar-btn" title="删除线 (Alt+Shift+5)" onclick={toggleStrikethrough}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M16 4H9a3 3 0 0 0-3 3v0a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H8"/>
        <line x1="4" y1="12" x2="20" y2="12"/>
      </svg>
    </button>

    <div class="toolbar-separator"></div>

    <button class="toolbar-btn" title="大纲导航" onclick={() => showOutline = !showOutline}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    </button>
    <button class="toolbar-btn" class:active={isSourceMode} title="源码模式 (Ctrl+/)" onclick={toggleSourceMode}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
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
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="editor-wrapper" ondrop={handleImageDrop} ondragover={(e) => e.preventDefault()} onpaste={handleImagePaste}>
    {#if isSourceMode}
      <textarea
        class="source-editor"
        bind:this={sourceTextarea}
        bind:value={sourceContent}
        oninput={() => { isModified = true }}
        spellcheck="false"
      ></textarea>
    {:else}
      <div class="editor-content" bind:this={editorContainer}></div>
    {/if}
  </div>

  <!-- Status Bar -->
  <div class="status-bar">
    <span>{statusText}</span>
    <span>{theme === 'dark' ? '暗色' : '亮色'}模式</span>
  </div>
</div>
