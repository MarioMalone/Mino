<script lang="ts">
  import { getOutlineItems, scrollToPosition, type OutlineItem } from './editor'

  let { visible = $bindable(false) }: { visible: boolean } = $props()

  let items: OutlineItem[] = $state([])
  let refreshTimer: ReturnType<typeof setInterval> | null = null

  $effect(() => {
    if (visible) {
      refreshOutline()
      refreshTimer = setInterval(refreshOutline, 2000)
    } else {
      if (refreshTimer) {
        clearInterval(refreshTimer)
        refreshTimer = null
      }
    }
  })

  function refreshOutline() {
    items = getOutlineItems()
  }

  function handleClick(item: OutlineItem) {
    scrollToPosition(item.pos)
  }
</script>

{#if visible}
  <div class="outline-panel">
    <div class="outline-header">
      <span class="outline-title">大纲</span>
      <button class="outline-close" aria-label="关闭大纲" onclick={() => visible = false}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="outline-list">
      {#if items.length === 0}
        <div class="outline-empty">暂无标题</div>
      {:else}
        {#each items as item}
          <button
            class="outline-item"
            class:h1={item.level === 1}
            class:h2={item.level === 2}
            class:h3={item.level === 3}
            class:h4={item.level >= 4}
            onclick={() => handleClick(item)}
            title={item.text}
          >
            {item.text}
          </button>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style>
  .outline-panel {
    position: fixed;
    top: 44px;
    left: 0;
    bottom: 24px;
    width: 240px;
    z-index: 90;
    background: var(--bg-toolbar);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .outline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .outline-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .outline-close {
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

  .outline-close:hover {
    background: var(--border-color);
  }

  .outline-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .outline-empty {
    padding: 16px 12px;
    text-align: center;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .outline-item {
    display: block;
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    padding: 4px 12px;
    font-size: 13px;
    line-height: 1.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-radius: 0;
    font-family: var(--font-sans);
  }

  .outline-item:hover {
    background: var(--border-color);
  }

  .outline-item.h1 {
    padding-left: 12px;
    font-weight: 600;
    font-size: 14px;
  }

  .outline-item.h2 {
    padding-left: 24px;
    font-weight: 500;
  }

  .outline-item.h3 {
    padding-left: 36px;
  }

  .outline-item.h4 {
    padding-left: 48px;
    font-size: 12px;
    color: var(--text-secondary);
  }
</style>
