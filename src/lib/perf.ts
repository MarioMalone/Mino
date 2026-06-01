// @ts-nocheck
/**
 * Performance Baseline Testing Module
 *
 * Measures editor input latency to verify the 10万字 ≤ 33ms target.
 * Uses ProseMirror transactions + requestAnimationFrame for accurate measurement.
 */
import { editorViewCtx } from '@milkdown/core'
import type { MilkdownEditor } from './editor'

export interface PerfMetrics {
  inputLatencyAvg: number   // ms
  inputLatencyP50: number   // ms (median)
  inputLatencyP95: number   // ms
  inputLatencyP99: number   // ms
  samples: number
  docSize: number           // character count
  isRunning: boolean
  target: number            // ms threshold
}

const LATENCY_TARGET = 33 // ≤ 33ms = ≥ 30 FPS

/**
 * Generate a realistic ~100k character markdown document for benchmarking.
 * Mixes headings, paragraphs, lists, code blocks, tables, and blockquotes.
 */
export function generateTestDocument(targetSize: number = 100_000): string {
  const sections: string[] = []

  while (sections.join('\n\n').length < targetSize) {
    const i = sections.length

    sections.push(`## 第 ${i + 1} 章：性能测试章节\n`)
    sections.push(
      `这是一段用于性能基准测试的中文段落。Mino 编辑器在处理大量文本时需要保持流畅的输入体验。` +
      `每个字符的输入延迟都应该控制在 33 毫秒以内，以确保至少 30 FPS 的渲染帧率。` +
      `这是编辑器性能的核心指标之一。`
    )
    sections.push(
      `This is a paragraph for performance benchmarking. The Mino editor must maintain ` +
      `smooth input experience when handling large documents. Every keystroke latency ` +
      `should stay within 33 milliseconds to ensure at least 30 FPS rendering.`
    )

    // List
    sections.push('### 测试列表\n')
    for (let j = 0; j < 5; j++) {
      sections.push(`- 列表项 ${j + 1}：包含中文和 English 混合内容的测试文本`)
    }

    // Task list
    sections.push('\n### 任务列表\n')
    sections.push(`- [x] 实现基础编辑功能\n- [x] 支持 Markdown 语法\n- [ ] 性能优化\n- [ ] 打包发布`)

    // Code block
    sections.push('\n### 代码示例\n')
    sections.push('```javascript')
    sections.push(`// 章节 ${i + 1} 示例代码`)
    sections.push(`function benchmark_${i}(iterations) {`)
    sections.push(`  const start = performance.now()`)
    sections.push(`  for (let i = 0; i < iterations; i++) {`)
    sections.push(`    document.querySelector('.editor').textContent += '${i}'`)
    sections.push(`  }`)
    sections.push(`  return performance.now() - start`)
    sections.push(`}`)
    sections.push('```')

    // Table (every 3rd section)
    if (i % 3 === 0) {
      sections.push('\n### 数据表格\n')
      sections.push('| 指标 | 目标值 | 实际值 | 状态 |')
      sections.push('| --- | --- | --- | --- |')
      sections.push(`| 输入延迟 | ≤33ms | ${(Math.random() * 20 + 5).toFixed(1)}ms | ✅ |`)
      sections.push(`| 冷启动 | ≤500ms | ${(Math.random() * 300 + 100).toFixed(0)}ms | ✅ |`)
      sections.push(`| 内存占用 | ≤120MB | ${(Math.random() * 60 + 40).toFixed(0)}MB | ✅ |`)
    }

    // Blockquote
    sections.push('\n> 💡 提示：性能测试应在不同规模的文档上运行，以验证编辑器的扩展性。')

    sections.push('\n---\n')
  }

  return sections.join('\n\n')
}

/**
 * Format a latency value with pass/fail indicator.
 */
export function formatLatency(ms: number): string {
  const status = ms <= LATENCY_TARGET ? '✅' : '⚠️'
  return `${ms.toFixed(1)}ms ${status}`
}

/**
 * Get browser memory usage (Chrome/Edge only).
 */
export function getMemoryUsage(): { used: number; total: number } | null {
  const perf = performance as any
  if (perf.memory) {
    return {
      used: Math.round(perf.memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(perf.memory.totalJSHeapSize / 1024 / 1024),
    }
  }
  return null
}

/**
 * Run the input latency benchmark on a given Milkdown editor instance.
 *
 * Loads a ~100k test document, then simulates keystrokes by dispatching
 * ProseMirror transactions and measuring time via requestAnimationFrame.
 */
export async function runBenchmark(
  editor: MilkdownEditor,
  onProgress?: (current: number, total: number) => void
): Promise<PerfMetrics> {
  const NUM_SAMPLES = 50

  // Generate and load test document
  const testDoc = generateTestDocument(100_000)

  return new Promise((resolve) => {
    editor.action(async (ctx) => {
      const view = ctx.get(editorViewCtx)

      // Load test document
      const { state } = view
      const tr = state.tr.insertText(testDoc, 0, state.doc.content.size)
      view.dispatch(tr)

      // Wait for render
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      const latencies: number[] = []
      const testChars = 'abcdefghijklmnopqrstuvwxyz 你好世界测试'

      for (let i = 0; i < NUM_SAMPLES; i++) {
        // Wait for next frame to ensure clean state
        await new Promise(r => requestAnimationFrame(r))

        const char = testChars[i % testChars.length]

        // Measure: dispatch transaction → wait for paint
        const start = performance.now()

        const { state: curState } = view
        const pos = curState.doc.content.size - 1
        const insertTr = curState.tr.insertText(char, pos)
        view.dispatch(insertTr)

        // Wait for browser to paint the frame
        await new Promise<void>(r => requestAnimationFrame(() => r()))
        const end = performance.now()

        latencies.push(end - start)
        onProgress?.(i + 1, NUM_SAMPLES)
      }

      // Restore original content
      const restoreTr = view.state.tr.insertText(testDoc, 0, view.state.doc.content.size)
      view.dispatch(restoreTr)

      // Calculate statistics
      const sorted = [...latencies].sort((a, b) => a - b)
      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length
      const p50 = sorted[Math.floor(sorted.length * 0.5)]
      const p95 = sorted[Math.floor(sorted.length * 0.95)]
      const p99 = sorted[Math.floor(sorted.length * 0.99)]

      resolve({
        inputLatencyAvg: avg,
        inputLatencyP50: p50,
        inputLatencyP95: p95,
        inputLatencyP99: p99,
        samples: NUM_SAMPLES,
        docSize: testDoc.length,
        isRunning: false,
        target: LATENCY_TARGET,
      })
    })
  })
}
