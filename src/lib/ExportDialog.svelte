<script lang="ts">
  import { invoke } from '@tauri-apps/api/core'
  import { save } from '@tauri-apps/plugin-dialog'

  let {
    visible = $bindable(false),
    currentFilePath,
    getContent,
  }: {
    visible: boolean
    currentFilePath: string | null
    getContent: () => string
  } = $props()

  interface ExportFormat {
    id: string
    name: string
    ext: string
  }

  let formats: ExportFormat[] = $state([])
  let selectedFormat = $state('docx')
  let isExporting = $state(false)
  let error = $state('')
  let hasPandoc = $state(false)
  let checking = $state(true)

  // Check pandoc availability and load formats
  $effect(() => {
    if (visible) {
      checkPandoc()
      loadFormats()
    }
  })

  async function checkPandoc() {
    checking = true
    try {
      hasPandoc = await invoke<boolean>('check_pandoc')
    } catch {
      hasPandoc = false
    } finally {
      checking = false
    }
  }

  async function loadFormats() {
    try {
      formats = await invoke<ExportFormat[]>('get_export_formats')
    } catch {
      formats = [
        { id: 'docx', name: 'Word (.docx)', ext: 'docx' },
        { id: 'html', name: 'HTML (.html)', ext: 'html' },
        { id: 'pdf', name: 'PDF (.pdf)', ext: 'pdf' },
      ]
    }
  }

  async function handleExport() {
    if (!hasPandoc) {
      error = 'Pandoc 未安装。请先安装 Pandoc 后再使用导出功能。'
      return
    }

    error = ''
    isExporting = true

    try {
      // Get output path
      const format = formats.find(f => f.id === selectedFormat)
      if (!format) {
        error = '未知格式'
        return
      }

      // Build default output path
      let defaultPath = ''
      if (currentFilePath) {
        const baseName = currentFilePath.replace(/\.md$/i, '')
        defaultPath = `${baseName}.${format.ext}`
      }

      const outputPath = await save({
        defaultPath,
        filters: [{ name: format.name, extensions: [format.ext] }],
      })

      if (!outputPath) {
        isExporting = false
        return
      }

      // If no current file, save content to temp file first
      let inputPath = currentFilePath
      if (!inputPath) {
        // Save to temp file
        const content = getContent()
        const tempDir = await invoke<string>('read_file', { path: '' }).catch(() => '')
        // Use a simple approach: save to a temp location
        inputPath = outputPath + '.tmp.md'
        await invoke('write_file', { path: inputPath, content })
      }

      // Export
      const result = await invoke<string>('export_with_pandoc', {
        inputPath,
        outputPath,
        format: selectedFormat,
      })

      // Clean up temp file if created
      if (!currentFilePath && inputPath) {
        // Ignore cleanup errors
      }

      visible = false
      error = ''
      // Show success message via status bar or notification
    } catch (err) {
      error = String(err)
    } finally {
      isExporting = false
    }
  }

  function handleClose() {
    visible = false
    error = ''
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="export-overlay" onclick={handleClose}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="export-dialog" onclick={(e) => e.stopPropagation()}>
      <div class="export-header">
        <span class="export-title">导出文档</span>
        <button class="export-close" onclick={handleClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="export-body">
        {#if checking}
          <div class="export-status">检查 Pandoc...</div>
        {:else if !hasPandoc}
          <div class="export-notice">
            <p>⚠️ Pandoc 未安装</p>
            <p class="export-notice-desc">
              导出功能需要 Pandoc 支持。请从
              <a href="https://pandoc.org/installing.html" target="_blank">pandoc.org</a>
              下载安装后重试。
            </p>
          </div>
        {:else}
          <div class="export-field">
            <label class="export-label">导出格式</label>
            <div class="export-formats">
              {#each formats as format}
                <button
                  class="export-format-btn"
                  class:selected={selectedFormat === format.id}
                  onclick={() => selectedFormat = format.id}
                >
                  {format.name}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        {#if error}
          <div class="export-error">{error}</div>
        {/if}
      </div>

      <div class="export-footer">
        <button class="export-cancel" onclick={handleClose}>取消</button>
        <button
          class="export-confirm"
          disabled={!hasPandoc || isExporting}
          onclick={handleExport}
        >
          {isExporting ? '导出中...' : '导出'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .export-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .export-dialog {
    width: 400px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }

  .export-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .export-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .export-close {
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

  .export-close:hover {
    background: var(--border-color);
  }

  .export-body {
    padding: 16px;
  }

  .export-status {
    text-align: center;
    color: var(--text-secondary);
    font-size: 13px;
    padding: 12px 0;
  }

  .export-notice {
    text-align: center;
    padding: 12px 0;
  }

  .export-notice p {
    margin: 4px 0;
    color: var(--text-primary);
    font-size: 14px;
  }

  .export-notice-desc {
    font-size: 13px !important;
    color: var(--text-secondary) !important;
  }

  .export-notice a {
    color: var(--accent-color);
    text-decoration: none;
  }

  .export-notice a:hover {
    text-decoration: underline;
  }

  .export-field {
    margin-bottom: 12px;
  }

  .export-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .export-formats {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .export-format-btn {
    padding: 6px 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    font-size: 13px;
    font-family: var(--font-sans);
    transition: all 0.15s;
  }

  .export-format-btn:hover {
    border-color: var(--accent-color);
  }

  .export-format-btn.selected {
    background: var(--accent-color);
    color: white;
    border-color: var(--accent-color);
  }

  .export-error {
    margin-top: 8px;
    padding: 8px;
    background: rgba(211, 47, 47, 0.1);
    border-radius: 4px;
    color: #d32f2f;
    font-size: 12px;
  }

  .export-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--border-color);
  }

  .export-cancel,
  .export-confirm {
    padding: 6px 16px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-family: var(--font-sans);
  }

  .export-cancel {
    background: transparent;
    color: var(--text-primary);
  }

  .export-cancel:hover {
    background: var(--border-color);
  }

  .export-confirm {
    background: var(--accent-color);
    color: white;
    border-color: var(--accent-color);
  }

  .export-confirm:hover {
    background: var(--accent-hover);
  }

  .export-confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
