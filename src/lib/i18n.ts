import { writable, derived } from 'svelte/store'

export type Locale = 'zh' | 'en'

const translations: Record<Locale, Record<string, string>> = {
  zh: {
    // Toolbar
    'toolbar.new': '新窗口 (Ctrl+N)',
    'toolbar.open': '打开 (Ctrl+O)',
    'toolbar.save': '保存 (Ctrl+S)',
    'toolbar.export': '导出',
    'toolbar.bold': '加粗 (Ctrl+B)',
    'toolbar.italic': '斜体 (Ctrl+I)',
    'toolbar.code': '行内代码 (Ctrl+`)',
    'toolbar.strikethrough': '删除线 (Alt+Shift+5)',
    'toolbar.fileTree': '文件树',
    'toolbar.recent': '最近打开',
    'toolbar.outline': '大纲导航',
    'toolbar.split': '双栏模式 (Ctrl+Shift+/)',
    'toolbar.source': '源码模式 (Ctrl+/)',
    'toolbar.theme': '切换主题',

    // Status
    'status.ready': '就绪',
    'status.opening': '正在打开...',
    'status.opened': '已加载',
    'status.openFailed': '打开失败',
    'status.saving': '正在保存...',
    'status.saved': '已保存',
    'status.saveFailed': '保存失败',
    'status.newFile': '新建文件',
    'status.sourceMode': '切换到源码模式',
    'status.previewMode': '切换到即时预览',
    'status.splitMode': '切换到双栏模式',
    'status.imgInserted': '已插入图片',
    'status.imgInsertFailed': '图片插入失败',
    'status.wv2Missing': '⚠️ WebView2 运行时未安装，部分功能可能不可用',
    'status.perfRunning': '正在运行性能基准测试...',
    'status.perfPassed': '性能测试通过',
    'status.perfFailed': '性能测试未达标',
    'status.perfNeedPreview': '请切换到即时预览模式再运行性能测试',
    'status.perfNoEditor': '请先打开编辑器',
    'status.themeLight': '亮色模式',
    'status.themeDark': '暗色模式',

    // Status bar word count
    'status.words': '字',
    'status.chars': '字符',
    'status.readTime.lt1': '< 1 分钟',
    'status.readTime.approx': '≈ {n} 分钟',

    // Recent files
    'recent.title': '最近打开',
    'recent.clear': '清空',
    'recent.empty': '暂无记录',
    'time.justNow': '刚刚',
    'time.minutesAgo': '{n} 分钟前',
    'time.hoursAgo': '{n} 小时前',
    'time.daysAgo': '{n} 天前',

    // Search
    'search.placeholder': '搜索...',
    'search.replacePlaceholder': '替换...',
    'search.regex': '正则',
    'search.caseSensitive': '区分大小写',
    'search.matchCount': '{n} 个匹配',
    'search.noMatch': '无匹配',

    // Outline
    'outline.title': '文档大纲',

    // File tree
    'fileTree.title': '文件树',

    // Export dialog
    'export.title': '导出文档',
    'export.format': '导出格式',
    'export.exporting': '正在导出...',
    'export.success': '导出成功',
    'export.failed': '导出失败',
    'export.noPandoc': '未检测到 Pandoc，请先安装',
    'export.close': '关闭',
    'export.export': '导出',

    // Perf panel
    'perf.title': '性能基线测试',
    'perf.hint': '按 Ctrl+Shift+P 运行测试',
    'perf.hintDetail': '在 10 万字文档上测量输入延迟',
    'perf.running': '正在测量输入延迟...',
    'perf.passed': '✅ 通过',
    'perf.failed': '⚠️ 未达标',
    'perf.target': '目标: ≤ {n}ms (≥ 30 FPS)',
    'perf.avg': '平均延迟',
    'perf.p50': 'P50 (中位数)',
    'perf.p95': 'P95',
    'perf.p99': 'P99',
    'perf.samples': '采样数',
    'perf.docSize': '文档大小',
    'perf.memory': 'JS 堆内存',
    'perf.sampleUnit': '次',
    'perf.charUnit': '字符',

    // Default content
    'default.title': '欢迎使用 Mino / Welcome to Mino',
    'default.desc': '开始写下你的想法吧！',
    'default.descEn': 'Start writing your thoughts here!',
    'default.newDoc': '# 新文档\n\n开始写下你的想法吧！\n\nStart writing your thoughts here!\n',

    // Keyboard shortcuts
    'shortcuts.title': '## 快捷键 / Shortcuts',
    'shortcuts.table': '| 快捷键 | 功能 |\n| --- | --- |\n| Ctrl+N | 新窗口 New Window |\n| Ctrl+B | 加粗 Bold |\n| Ctrl+I | 斜体 Italic |\n| Ctrl+S | 保存 Save |\n| Ctrl+F | 搜索 Find |\n| Ctrl+/ | 源码模式 Source Mode |',

    // Language
    'lang.switch': '切换语言',
    'lang.zh': '中文',
    'lang.en': 'English',
  },
  en: {
    // Toolbar
    'toolbar.new': 'New Window (Ctrl+N)',
    'toolbar.open': 'Open (Ctrl+O)',
    'toolbar.save': 'Save (Ctrl+S)',
    'toolbar.export': 'Export',
    'toolbar.bold': 'Bold (Ctrl+B)',
    'toolbar.italic': 'Italic (Ctrl+I)',
    'toolbar.code': 'Inline Code (Ctrl+`)',
    'toolbar.strikethrough': 'Strikethrough (Alt+Shift+5)',
    'toolbar.fileTree': 'File Tree',
    'toolbar.recent': 'Recent Files',
    'toolbar.outline': 'Outline',
    'toolbar.split': 'Split Mode (Ctrl+Shift+/)',
    'toolbar.source': 'Source Mode (Ctrl+/)',
    'toolbar.theme': 'Toggle Theme',

    // Status
    'status.ready': 'Ready',
    'status.opening': 'Opening...',
    'status.opened': 'Loaded',
    'status.openFailed': 'Open failed',
    'status.saving': 'Saving...',
    'status.saved': 'Saved',
    'status.saveFailed': 'Save failed',
    'status.newFile': 'New File',
    'status.sourceMode': 'Switched to source mode',
    'status.previewMode': 'Switched to preview mode',
    'status.splitMode': 'Switched to split mode',
    'status.imgInserted': 'Image inserted',
    'status.imgInsertFailed': 'Image insert failed',
    'status.wv2Missing': '⚠️ WebView2 runtime not installed, some features may not work',
    'status.perfRunning': 'Running performance benchmark...',
    'status.perfPassed': 'Performance test passed',
    'status.perfFailed': 'Performance test failed',
    'status.perfNeedPreview': 'Switch to preview mode first',
    'status.perfNoEditor': 'Please open the editor first',
    'status.themeLight': 'Light mode',
    'status.themeDark': 'Dark mode',

    // Status bar word count
    'status.words': 'words',
    'status.chars': 'chars',
    'status.readTime.lt1': '< 1 min',
    'status.readTime.approx': '≈ {n} min',

    // Recent files
    'recent.title': 'Recent Files',
    'recent.clear': 'Clear',
    'recent.empty': 'No records',
    'time.justNow': 'just now',
    'time.minutesAgo': '{n} min ago',
    'time.hoursAgo': '{n}h ago',
    'time.daysAgo': '{n}d ago',

    // Search
    'search.placeholder': 'Search...',
    'search.replacePlaceholder': 'Replace...',
    'search.regex': 'Regex',
    'search.caseSensitive': 'Case Sensitive',
    'search.matchCount': '{n} matches',
    'search.noMatch': 'No matches',

    // Outline
    'outline.title': 'Document Outline',

    // File tree
    'fileTree.title': 'File Tree',

    // Export dialog
    'export.title': 'Export Document',
    'export.format': 'Format',
    'export.exporting': 'Exporting...',
    'export.success': 'Export successful',
    'export.failed': 'Export failed',
    'export.noPandoc': 'Pandoc not found, please install it first',
    'export.close': 'Close',
    'export.export': 'Export',

    // Perf panel
    'perf.title': 'Performance Baseline',
    'perf.hint': 'Press Ctrl+Shift+P to run',
    'perf.hintDetail': 'Measures input latency on 100k char document',
    'perf.running': 'Measuring input latency...',
    'perf.passed': '✅ Passed',
    'perf.failed': '⚠️ Failed',
    'perf.target': 'Target: ≤ {n}ms (≥ 30 FPS)',
    'perf.avg': 'Avg Latency',
    'perf.p50': 'P50 (Median)',
    'perf.p95': 'P95',
    'perf.p99': 'P99',
    'perf.samples': 'Samples',
    'perf.docSize': 'Doc Size',
    'perf.memory': 'JS Heap Memory',
    'perf.sampleUnit': 'runs',
    'perf.charUnit': 'chars',

    // Default content
    'default.title': 'Welcome to Mino / 欢迎使用 Mino',
    'default.desc': 'Start writing your thoughts here!',
    'default.descEn': '开始写下你的想法吧！',
    'default.newDoc': '# New Document\n\nStart writing your thoughts here!\n\n开始写下你的想法吧！\n',

    // Keyboard shortcuts
    'shortcuts.title': '## Shortcuts / 快捷键',
    'shortcuts.table': '| Shortcut | Function |\n| --- | --- |\n| Ctrl+N | New Window |\n| Ctrl+B | Bold |\n| Ctrl+I | Italic |\n| Ctrl+S | Save |\n| Ctrl+F | Find |\n| Ctrl+/ | Source Mode |',

    // Language
    'lang.switch': 'Language',
    'lang.zh': '中文',
    'lang.en': 'English',
  },
}

const LOCALE_KEY = 'mino-locale'

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY)
    if (stored === 'zh' || stored === 'en') return stored
  } catch {}
  // Default to system language
  const lang = navigator.language.toLowerCase()
  return lang.startsWith('zh') ? 'zh' : 'en'
}

export const locale = writable<Locale>(getInitialLocale())

// Persist locale changes
locale.subscribe((val) => {
  try {
    localStorage.setItem(LOCALE_KEY, val)
  } catch {}
})

/**
 * Translation function.
 * Usage: $t('key') or $t('key', { n: 42 })
 */
export function createT(currentLocale: Locale) {
  return function t(key: string, params?: Record<string, string | number>): string {
    let str = translations[currentLocale]?.[key] ?? translations['zh']?.[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, String(v))
      }
    }
    return str
  }
}

// Derived store: reactive translation function
export const t = derived(locale, ($locale) => {
  return (key: string, params?: Record<string, string | number>): string => {
    let str = translations[$locale]?.[key] ?? translations['zh']?.[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, String(v))
      }
    }
    return str
  }
})
