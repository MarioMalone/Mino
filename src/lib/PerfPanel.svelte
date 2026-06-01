<script lang="ts">
  import type { PerfMetrics } from './perf'
  import { formatLatency, getMemoryUsage } from './perf'

  let { visible = $bindable(false) }: { visible?: boolean } = $props()

  let metrics = $state<PerfMetrics | null>(null)
  let memoryInfo = $state<{ used: number; total: number } | null>(null)

  // Update memory info when panel opens
  $effect(() => {
    if (visible) {
      memoryInfo = getMemoryUsage()
    }
  })

  export function setMetrics(m: PerfMetrics) {
    metrics = m
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if visible}
  <div class="perf-panel" onclick={(e) => e.stopPropagation()}>
    <div class="perf-header">
      <span>性能基线测试</span>
      <button class="perf-close" onclick={() => visible = false}>✕</button>
    </div>

    <div class="perf-body">
      {#if metrics === null}
        <div class="perf-hint">
          按 <kbd>Ctrl+Shift+P</kbd> 运行测试<br/>
          在 10 万字文档上测量输入延迟
        </div>
      {:else if metrics.isRunning}
        <div class="perf-running">
          <div class="perf-spinner"></div>
          <span>正在测量输入延迟...</span>
        </div>
      {:else}
        <!-- Header: overall result -->
        <div class="perf-result-header"
          class:perf-pass={metrics.inputLatencyP95 <= metrics.target}
          class:perf-fail={metrics.inputLatencyP95 > metrics.target}>
          {#if metrics.inputLatencyP95 <= metrics.target}
            ✅ 通过
          {:else}
            ⚠️ 未达标
          {/if}
          <span class="perf-target">目标: ≤ {metrics.target}ms (≥ 30 FPS)</span>
        </div>

        <!-- Metrics table -->
        <div class="perf-metrics">
          <div class="perf-metric">
            <span class="perf-label">平均延迟</span>
            <span class="perf-value">{formatLatency(metrics.inputLatencyAvg)}</span>
          </div>
          <div class="perf-metric">
            <span class="perf-label">P50 (中位数)</span>
            <span class="perf-value">{formatLatency(metrics.inputLatencyP50)}</span>
          </div>
          <div class="perf-metric">
            <span class="perf-label">P95</span>
            <span class="perf-value" class:perf-warn={metrics.inputLatencyP95 > metrics.target}>
              {formatLatency(metrics.inputLatencyP95)}
            </span>
          </div>
          <div class="perf-metric">
            <span class="perf-label">P99</span>
            <span class="perf-value" class:perf-warn={metrics.inputLatencyP99 > metrics.target}>
              {formatLatency(metrics.inputLatencyP99)}
            </span>
          </div>
          <div class="perf-metric">
            <span class="perf-label">采样数</span>
            <span class="perf-value">{metrics.samples} 次</span>
          </div>
          <div class="perf-metric">
            <span class="perf-label">文档大小</span>
            <span class="perf-value">{(metrics.docSize / 1000).toFixed(0)}k 字符</span>
          </div>
          {#if memoryInfo}
            <div class="perf-metric">
              <span class="perf-label">JS 堆内存</span>
              <span class="perf-value">{memoryInfo.used} / {memoryInfo.total} MB</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
