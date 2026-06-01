<script lang="ts">
  import { searchInEditor, clearSearch, findNext, findPrev, replaceCurrent, replaceAll } from './editor'

  let { visible = $bindable(false) }: { visible: boolean } = $props()

  let searchInput: HTMLInputElement | undefined = $state(undefined)
  let query = $state('')
  let replacement = $state('')
  let useRegex = $state(false)
  let caseSensitive = $state(false)
  let showReplace = $state(false)
  let matchCount = $state(0)
  let currentIndex = $state(-1)

  $effect(() => {
    if (visible) {
      setTimeout(() => searchInput?.focus(), 50)
    }
  })

  function handleSearch() {
    if (!query) {
      clearSearch()
      matchCount = 0
      currentIndex = -1
      return
    }
    matchCount = searchInEditor(query, useRegex, caseSensitive)
    currentIndex = matchCount > 0 ? 0 : -1
  }

  function handleFindNext() {
    if (findNext()) {
      currentIndex = (currentIndex + 1) % matchCount
    }
  }

  function handleFindPrev() {
    if (findPrev()) {
      currentIndex = (currentIndex - 1 + matchCount) % matchCount
    }
  }

  function handleReplace() {
    replaceCurrent(replacement)
    // Re-search after replace
    handleSearch()
  }

  function handleReplaceAll() {
    const count = replaceAll(replacement)
    if (count > 0) {
      handleSearch()
    }
  }

  function handleClose() {
    clearSearch()
    query = ''
    replacement = ''
    matchCount = 0
    currentIndex = -1
    visible = false
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose()
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        handleFindPrev()
      } else {
        handleFindNext()
      }
    }
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="search-bar" role="search" aria-label="查找与替换" onkeydown={handleKeydown}>
    <div class="search-row">
      <button class="search-toggle-btn" title="展开/收起替换" onclick={() => showReplace = !showReplace}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          {#if showReplace}
            <polyline points="6 9 12 15 18 9"/>
          {:else}
            <polyline points="9 6 15 12 9 18"/>
          {/if}
        </svg>
      </button>

      <input
        bind:this={searchInput}
        bind:value={query}
        oninput={handleSearch}
        class="search-input"
        type="text"
        placeholder="搜索..."
      />

      <span class="search-count">
        {#if matchCount > 0}
          {currentIndex + 1} / {matchCount}
        {:else if query}
          无结果
        {/if}
      </span>

      <button class="search-btn" title="上一个 (Shift+Enter)" onclick={handleFindPrev}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>
      <button class="search-btn" title="下一个 (Enter)" onclick={handleFindNext}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <button class="search-btn" class:active={useRegex} title="正则表达式" onclick={() => { useRegex = !useRegex; handleSearch() }}>
        <span class="regex-icon">.*</span>
      </button>
      <button class="search-btn" class:active={caseSensitive} title="区分大小写" onclick={() => { caseSensitive = !caseSensitive; handleSearch() }}>
        <span class="case-icon">Aa</span>
      </button>

      <button class="search-btn search-close" title="关闭 (Esc)" onclick={handleClose}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    {#if showReplace}
      <div class="search-row">
        <div class="search-spacer"></div>
        <input
          bind:value={replacement}
          class="search-input"
          type="text"
          placeholder="替换..."
          onkeydown={(e) => { if (e.key === 'Enter') handleReplace() }}
        />
        <button class="search-btn" title="替换" onclick={handleReplace}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
          </svg>
        </button>
        <button class="search-btn" title="全部替换" onclick={handleReplaceAll}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <polyline points="17 13 21 17 17 21"/>
            <path d="M3 23V21a4 4 0 0 1 4-4h14"/>
          </svg>
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .search-bar {
    position: fixed;
    top: 44px;
    right: 16px;
    z-index: 100;
    background: var(--bg-toolbar);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 360px;
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .search-toggle-btn {
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
    flex-shrink: 0;
  }

  .search-toggle-btn:hover {
    background: var(--border-color);
  }

  .search-spacer {
    width: 24px;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    font-family: var(--font-sans);
    outline: none;
  }

  .search-input:focus {
    border-color: var(--accent-color);
  }

  .search-count {
    font-size: 12px;
    color: var(--text-secondary);
    min-width: 50px;
    text-align: center;
    white-space: nowrap;
  }

  .search-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    flex-shrink: 0;
  }

  .search-btn:hover {
    background: var(--border-color);
  }

  .search-btn.active {
    background: var(--accent-color);
    color: white;
  }

  .search-close {
    margin-left: 4px;
  }

  .regex-icon, .case-icon {
    font-size: 12px;
    font-weight: 600;
    font-family: var(--font-mono);
  }

  :global(.mino-search-match) {
    background: rgba(255, 213, 0, 0.4);
    border-radius: 2px;
  }

  :global(.mino-search-match-current) {
    background: rgba(255, 150, 0, 0.6);
    border-radius: 2px;
  }
</style>
