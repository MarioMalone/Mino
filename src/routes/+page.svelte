<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte'
  import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
  import { createEditor, getEditorMarkdown, destroyEditor, toggleBold, toggleItalic, toggleCode, toggleStrikethrough, onEditorChange, offEditorChange, insertTextAtCursor, getEditorInstance } from '$lib/editor'
  import { openFileDialog, saveFileDialog, readFileContent, writeFileContent, copyFile, getDirectory, getRelativePath, checkWebView2 } from '$lib/file'
  import { createSplitView, destroySplitView, getSplitViewContent, isSplitViewActive } from '$lib/split-view'
  import SearchBar from '$lib/SearchBar.svelte'
  import OutlinePanel from '$lib/OutlinePanel.svelte'
  import FileTree from '$lib/FileTree.svelte'
  import ExportDialog from '$lib/ExportDialog.svelte'
  import PerfPanel from '$lib/PerfPanel.svelte'
  import { runBenchmark } from '$lib/perf'
  import '../styles/themes.css'
  import 'katex/dist/katex.min.css'

  let editorContainer: HTMLDivElement
  let sourceTextarea: HTMLTextAreaElement
  let currentFilePath: string | null = $state(null)
  let isModified = $state(false)
  let theme: 'light' | 'dark' = $state('light')
  let statusText = $state('就绪')
  let wordCount = $state(0)
  let charCount = $state(0)
  let readTime = $state('')

  // Source mode state
  let isSourceMode = $state(false)
  let sourceContent = $state('')
  // Split view mode state
  let isSplitMode = $state(false)

  // Auto-save state
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  const AUTO_SAVE_INTERVAL = 30_000 // 30 seconds

  // Search state
  let showSearch = $state(false)
  // Outline state
  let showOutline = $state(false)
  // Recent files state
  let showRecent = $state(false)
  let recentFiles: { path: string; name: string; lastOpened: number }[] = $state([])
  // File tree state
  let showFileTree = $state(false)
  // Export dialog state
  let showExport = $state(false)
  // Perf panel state
  let showPerf = $state(false)
  let perfPanelRef: PerfPanel | undefined = $state()

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
    // Check WebView2 runtime availability
    try {
      const wv2 = await checkWebView2()
      if (!wv2.installed) {
        statusText = '⚠️ WebView2 运行时未安装，部分功能可能不可用'
        console.warn('[Mino] WebView2 runtime not found')
      } else {
        console.log('[Mino] WebView2 version:', wv2.version)
      }
    } catch (e) {
      console.warn('[Mino] WebView2 check failed:', e)
    }

    // Detect system theme preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    theme = prefersDark ? 'dark' : 'light'
    applyTheme()

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      theme = e.matches ? 'dark' : 'light'
      applyTheme()
    })

    // Load recent files
    loadRecentFiles()

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
    // Click outside to close recent files dropdown
    window.addEventListener('click', handleGlobalClick)
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
      const md = getEditorMarkdown()
      updateWordCount(md)
    })
    // Initial word count
    updateWordCount(content)
  }

  function handleGlobalClick(e: MouseEvent) {
    // Close recent files dropdown when clicking outside
    const target = e.target as HTMLElement
    if (!target.closest('.recent-files-wrapper')) {
      showRecent = false
    }
  }

  onDestroy(async () => {
    stopAutoSave()
    offEditorChange()
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('blur', handleBlur)
    window.removeEventListener('click', handleGlobalClick)
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

  function isMarkdownFile(path: string): boolean {
    return path.toLowerCase().endsWith('.md')
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault()
    if (!e.dataTransfer) return

    const files = Array.from(e.dataTransfer.files)
    let hasMarkdown = false

    for (const file of files) {
      const name = file.name.toLowerCase()
      if (name.endsWith('.md') && !hasMarkdown) {
        // Open the first .md file dropped
        hasMarkdown = true
        try {
          // Read file content from the File object
          const content = await file.text()
          currentFilePath = null // We don't have the path from File API
          isModified = false
          statusText = `已加载: ${file.name}`
          await destroyEditor()
          await initEditor(content)
          updateWordCount(content)
        } catch (err) {
          statusText = `打开失败: ${err}`
        }
      } else if (IMAGE_EXTENSIONS.some(ext => name.endsWith(`.${ext}`))) {
        await insertImageFromFile(file)
      }
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
        case 'n':
          e.preventDefault()
          await handleNew()
          break
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
          if (e.shiftKey) {
            await toggleSplitMode()
          } else {
            await toggleSourceMode()
          }
          break
        case 'p':
          if (e.shiftKey) {
            e.preventDefault()
            await runPerfBench()
          }
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
      updateWordCount(content)
      startAutoSave()
      addRecentFile(path)
    } catch (err) {
      statusText = `打开失败: ${err}`
    }
  }

  async function doSave(): Promise<boolean> {
    if (!currentFilePath) return false
    try {
      const content = isSplitMode ? getSplitViewContent() : (isSourceMode ? sourceContent : getEditorMarkdown())
      await writeFileContent(currentFilePath, content)
      isModified = false
      statusText = `已保存: ${currentFilePath.split('\\').pop()}`
      addRecentFile(currentFilePath)
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
    // Open a new window for the new document
    try {
      const label = 'mino-' + Date.now()
      const webview = new WebviewWindow(label, {
        url: '/',
        title: 'Mino',
        width: 1000,
        height: 700,
        minWidth: 600,
        minHeight: 400,
      })
      webview.once('tauri://error', (e) => {
        console.error('[Mino] Failed to open new window:', e)
        // Fallback: reset current editor
        resetToNewFile()
      })
    } catch (err) {
      console.error('[Mino] New window error:', err)
      resetToNewFile()
    }
  }

  function resetToNewFile() {
    stopAutoSave()
    currentFilePath = null
    isModified = false
    statusText = '新建文件'
    destroyEditor().then(() => {
      initEditor('# 新文档\n\n开始写下你的想法吧！\n\nStart writing your thoughts here!\n')
    })
  }

  // ===== Source Mode Toggle =====

  async function toggleSourceMode() {
    if (isSplitMode) {
      // Exit split mode first
      const content = getSplitViewContent()
      await destroySplitView()
      isSplitMode = false
      if (isSourceMode) {
        sourceContent = content
        isModified = true
        statusText = '切换到源码模式'
      } else {
        isSourceMode = true
        sourceContent = content
        isModified = true
        statusText = '切换到源码模式'
      }
      return
    }

    if (isSourceMode) {
      // Save current source content before switching
      const content = sourceContent || '# 新文档\n\n开始写下你的想法吧！\n\nStart writing your thoughts here!\n'
      isSourceMode = false
      await destroyEditor()
      await initEditor(content)
      updateWordCount(content)
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

  // ===== Word Count =====

  function updateWordCount(text: string) {
    // Remove markdown syntax for accurate count
    const plainText = text
      .replace(/```[\s\S]*?```/g, '') // code blocks
      .replace(/`[^`]+`/g, '') // inline code
      .replace(/!?\[.*?\]\(.*?\)/g, '') // links/images
      .replace(/#{1,6}\s/g, '') // headings
      .replace(/[*_~]+/g, '') // formatting
      .replace(/---/g, '') // hr
      .replace(/>/g, '') // blockquote
      .trim()

    // Character count (excluding whitespace)
    charCount = plainText.replace(/\s/g, '').length

    // Word count: Chinese chars count as 1 word each, English words split by space
    const chineseChars = (plainText.match(/[一-鿿㐀-䶿]/g) || []).length
    const englishText = plainText.replace(/[一-鿿㐀-䶿]/g, ' ')
    const englishWords = englishText.split(/\s+/).filter(w => w.length > 0).length
    wordCount = chineseChars + englishWords

    // Reading time estimate: ~400 Chinese chars/min or ~200 English words/min
    const chineseReadTime = chineseChars / 400
    const englishReadTime = englishWords / 200
    const totalMinutes = Math.ceil(chineseReadTime + englishReadTime)
    if (totalMinutes < 1) {
      readTime = '< 1 分钟'
    } else {
      readTime = `≈ ${totalMinutes} 分钟`
    }
  }

  // ===== Export =====

  function getExportContent(): string {
    if (isSplitMode) return getSplitViewContent()
    if (isSourceMode) return sourceContent
    return getEditorMarkdown()
  }

  // ===== Performance Benchmark =====

  async function runPerfBench() {
    const instance = getEditorInstance()
    if (!instance) {
      statusText = '请先打开编辑器'
      return
    }
    if (isSourceMode || isSplitMode) {
      statusText = '请切换到即时预览模式再运行性能测试'
      return
    }

    showPerf = true
    statusText = '正在运行性能基准测试...'

    try {
      const result = await runBenchmark(instance)
      perfPanelRef?.setMetrics(result)
      statusText = result.inputLatencyP95 <= result.target
        ? `性能测试通过: P95=${result.inputLatencyP95.toFixed(1)}ms`
        : `性能测试未达标: P95=${result.inputLatencyP95.toFixed(1)}ms`
    } catch (err) {
      statusText = `性能测试失败: ${err}`
    }
  }

  // ===== File Tree =====

  async function handleFileTreeSelect(path: string) {
    try {
      statusText = '正在打开...'
      const content = await readFileContent(path)
      currentFilePath = path
      isModified = false
      statusText = `已加载: ${path.split('\\').pop()}`

      if (isSplitMode) {
        await destroySplitView()
        isSplitMode = false
      }
      if (isSourceMode) {
        isSourceMode = false
      }
      await destroyEditor()
      await initEditor(content)
      updateWordCount(content)
      startAutoSave()
      addRecentFile(path)
    } catch (err) {
      statusText = `打开失败: ${err}`
    }
  }

  // ===== Recent Files =====

  const RECENT_FILES_KEY = 'mino-recent-files'
  const MAX_RECENT_FILES = 10

  function loadRecentFiles() {
    try {
      const stored = localStorage.getItem(RECENT_FILES_KEY)
      if (stored) {
        recentFiles = JSON.parse(stored)
      }
    } catch {
      recentFiles = []
    }
  }

  function saveRecentFiles() {
    try {
      localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recentFiles))
    } catch {
      // Ignore storage errors
    }
  }

  function addRecentFile(path: string) {
    const name = path.split('\\').pop() ?? path.split('/').pop() ?? path
    // Remove existing entry for same path
    recentFiles = recentFiles.filter(f => f.path !== path)
    // Add to front
    recentFiles = [{ path, name, lastOpened: Date.now() }, ...recentFiles].slice(0, MAX_RECENT_FILES)
    saveRecentFiles()
  }

  async function openRecentFile(path: string) {
    showRecent = false
    try {
      statusText = '正在打开...'
      const content = await readFileContent(path)
      currentFilePath = path
      isModified = false
      statusText = `已加载: ${path.split('\\').pop()}`
      await destroyEditor()
      await initEditor(content)
      updateWordCount(content)
      startAutoSave()
    } catch (err) {
      statusText = `打开失败: ${err}`
      // Remove from recent if file can't be opened
      recentFiles = recentFiles.filter(f => f.path !== path)
      saveRecentFiles()
    }
  }

  function clearRecentFiles() {
    recentFiles = []
    saveRecentFiles()
    showRecent = false
  }

  function formatRelativeTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes} 分钟前`
    if (hours < 24) return `${hours} 小时前`
    if (days < 30) return `${days} 天前`
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }

  // ===== Split View Mode =====

  async function toggleSplitMode() {
    if (isSplitMode) {
      // Switch back to single pane WYSIWYG
      const content = getSplitViewContent()
      await destroySplitView()
      isSplitMode = false
      await initEditor(content)
      updateWordCount(content)
      isModified = true
      statusText = '切换到即时预览'
    } else {
      // Switch to split view
      let content: string
      if (isSourceMode) {
        content = sourceContent
        isSourceMode = false
      } else {
        content = getEditorMarkdown()
      }
      await destroyEditor()
      isSplitMode = true
      await tick()
      if (editorContainer) {
        await createSplitView(editorContainer, content)
        updateWordCount(content)
        isModified = true
        statusText = '切换到双栏模式'
      }
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
<FileTree bind:visible={showFileTree} onFileSelect={handleFileTreeSelect} />
<ExportDialog bind:visible={showExport} {currentFilePath} getContent={getExportContent} />
<PerfPanel bind:visible={showPerf} bind:this={perfPanelRef} />

<div class="app-container">
  <!-- Toolbar -->
  <div class="toolbar">
    <button class="toolbar-btn" title="新窗口 (Ctrl+N)" onclick={handleNew}>
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

    <button class="toolbar-btn" title="导出" onclick={() => showExport = true}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
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

    <button class="toolbar-btn" class:active={showFileTree} title="文件树" onclick={() => showFileTree = !showFileTree}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    </button>

    <!-- Recent Files -->
    <div class="recent-files-wrapper">
      <button class="toolbar-btn" title="最近打开" onclick={() => showRecent = !showRecent}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </button>
      {#if showRecent}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="recent-dropdown" onclick={(e) => e.stopPropagation()}>
          <div class="recent-header">
            <span>最近打开</span>
            {#if recentFiles.length > 0}
              <button class="recent-clear-btn" onclick={clearRecentFiles}>清空</button>
            {/if}
          </div>
          {#if recentFiles.length === 0}
            <div class="recent-empty">暂无记录</div>
          {:else}
            {#each recentFiles as file}
              <button class="recent-item" onclick={() => openRecentFile(file.path)} title={file.path}>
                <span class="recent-name">{file.name}</span>
                <span class="recent-time">{formatRelativeTime(file.lastOpened)}</span>
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

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
    <button class="toolbar-btn" class:active={isSplitMode} title="双栏模式 (Ctrl+Shift+/)" onclick={toggleSplitMode}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="12" y1="3" x2="12" y2="21"/>
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
  <div class="editor-wrapper" ondrop={handleDrop} ondragover={(e) => e.preventDefault()} onpaste={handleImagePaste}>
    {#if isSourceMode}
      <textarea
        class="source-editor"
        bind:this={sourceTextarea}
        bind:value={sourceContent}
        oninput={() => { isModified = true; updateWordCount(sourceContent) }}
        spellcheck="false"
      ></textarea>
    {:else}
      <div class="editor-content" bind:this={editorContainer}></div>
    {/if}
  </div>

  <!-- Status Bar -->
  <div class="status-bar">
    <span>{statusText}</span>
    <span class="status-center">{wordCount} 字 · {charCount} 字符 · {readTime}</span>
    <span>{theme === 'dark' ? '暗色' : '亮色'}模式</span>
  </div>
</div>
