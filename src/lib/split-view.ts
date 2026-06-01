import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter } from '@codemirror/language'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { highlight as milkdownHighlight, highlightPluginConfig } from '@milkdown/plugin-highlight'
import { createParser } from '@milkdown/plugin-highlight/lowlight'
import { common, createLowlight } from 'lowlight'
import remarkMath from 'remark-math'
import { math } from './math'
import { mermaid } from './mermaid'
import type { Editor as MilkdownEditor } from '@milkdown/core'

// Create lowlight instance for preview
const lowlight = createLowlight(common)
const highlightParser = createParser(lowlight)

export interface SplitViewState {
  cmView: EditorView | null
  previewEditor: MilkdownEditor | null
  container: HTMLElement | null
  previewContainer: HTMLElement | null
  isSyncing: boolean
  debounceTimer: ReturnType<typeof setTimeout> | null
}

let state: SplitViewState = {
  cmView: null,
  previewEditor: null,
  container: null,
  previewContainer: null,
  isSyncing: false,
  debounceTimer: null,
}

const DEBOUNCE_MS = 300

/**
 * Create the split view with CodeMirror on the left and Milkdown preview on the right.
 */
export async function createSplitView(
  container: HTMLElement,
  content: string
): Promise<void> {
  // Clean up existing
  await destroySplitView()

  state.container = container
  container.innerHTML = ''

  // Create split layout
  const splitWrapper = document.createElement('div')
  splitWrapper.className = 'split-view-wrapper'

  // Left pane: CodeMirror source editor
  const leftPane = document.createElement('div')
  leftPane.className = 'split-view-source'

  // Resizer
  const resizer = document.createElement('div')
  resizer.className = 'split-view-resizer'

  // Right pane: Milkdown preview
  const rightPane = document.createElement('div')
  rightPane.className = 'split-view-preview'

  splitWrapper.appendChild(leftPane)
  splitWrapper.appendChild(resizer)
  splitWrapper.appendChild(rightPane)
  container.appendChild(splitWrapper)

  state.previewContainer = rightPane

  // Create CodeMirror editor
  const cmTheme = getCMTheme()
  state.cmView = new EditorView({
    state: EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        foldGutter(),
        bracketMatching(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle),
        markdown(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        cmTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !state.isSyncing) {
            const newDoc = update.state.doc.toString()
            scheduleUpdatePreview(newDoc)
          }
        }),
        // Scroll sync: CM scroll → preview scroll
        EditorView.domEventHandlers({
          scroll: () => {
            syncScrollFromCM()
          },
        }),
        EditorView.lineWrapping,
      ],
    }),
    parent: leftPane,
  })

  // Create Milkdown preview (read-only)
  await createPreviewEditor(rightPane, content)

  // Setup resizer
  setupResizer(resizer, leftPane, rightPane)
}

/**
 * Create a read-only Milkdown preview editor.
 */
async function createPreviewEditor(container: HTMLElement, content: string): Promise<void> {
  container.innerHTML = ''

  state.previewEditor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, container)
      ctx.set(defaultValueCtx, content)

      ctx.set(highlightPluginConfig.key, {
        parser: highlightParser,
      })

      ctx.update(remarkPluginsCtx, (prev) => [...prev, remarkMath as any])
    })
    .use(commonmark)
    .use(gfm)
    .use(milkdownHighlight)
    .use(math)
    .use(mermaid)
    .create()

  // Make preview read-only
  setTimeout(() => {
    const editorDom = container.querySelector('.milkdown .editor') as HTMLElement
    if (editorDom) {
      editorDom.setAttribute('contenteditable', 'false')
    }
  }, 100)
}

// Need to import remarkPluginsCtx
import { remarkPluginsCtx } from '@milkdown/core'

/**
 * Schedule a debounced update of the preview.
 */
function scheduleUpdatePreview(content: string) {
  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer)
  }
  state.debounceTimer = setTimeout(async () => {
    await updatePreview(content)
  }, DEBOUNCE_MS)
}

/**
 * Update the Milkdown preview with new content.
 */
async function updatePreview(content: string) {
  if (!state.previewContainer || state.isSyncing) return
  state.isSyncing = true

  try {
    await createPreviewEditor(state.previewContainer, content)
  } finally {
    state.isSyncing = false
  }
}

/**
 * Sync scroll position from CodeMirror to preview.
 */
function syncScrollFromCM() {
  if (!state.cmView || !state.previewContainer) return

  const cmScrollDOM = state.cmView.scrollDOM
  const cmScrollTop = cmScrollDOM.scrollTop
  const cmScrollHeight = cmScrollDOM.scrollHeight - cmScrollDOM.clientHeight
  const scrollRatio = cmScrollHeight > 0 ? cmScrollTop / cmScrollHeight : 0

  const previewEl = state.previewContainer.querySelector('.editor-wrapper') as HTMLElement
    || state.previewContainer.firstElementChild as HTMLElement

  if (previewEl) {
    const previewScrollHeight = previewEl.scrollHeight - previewEl.clientHeight
    previewEl.scrollTop = scrollRatio * previewScrollHeight
  }
}

/**
 * Get CodeMirror theme based on current theme.
 */
function getCMTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'

  return EditorView.theme({
    '&': {
      backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
      color: isDark ? '#d4d4d4' : '#1a1a1a',
      height: '100%',
      fontSize: '14px',
    },
    '.cm-content': {
      fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', 'Source Code Pro', Menlo, Consolas, monospace",
      caretColor: isDark ? '#569cd6' : '#0000ff',
      lineHeight: '1.75',
    },
    '.cm-gutters': {
      backgroundColor: isDark ? '#252525' : '#f5f5f5',
      color: isDark ? '#888888' : '#999999',
      border: 'none',
      borderRight: `1px solid ${isDark ? '#3e3e3e' : '#e0e0e0'}`,
    },
    '.cm-activeLineGutter': {
      backgroundColor: isDark ? '#2d2d2d' : '#e8e8e8',
    },
    '.cm-activeLine': {
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    },
    '.cm-selectionMatch': {
      backgroundColor: isDark ? 'rgba(86,156,214,0.2)' : 'rgba(74,144,217,0.2)',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: isDark ? '#d4d4d4' : '#1a1a1a',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: isDark ? 'rgba(86,156,214,0.3)' : 'rgba(74,144,217,0.3)',
    },
  })
}

/**
 * Setup the resizer between source and preview panes.
 */
function setupResizer(resizer: HTMLElement, left: HTMLElement, right: HTMLElement) {
  let startX = 0
  let startLeftWidth = 0

  const onMouseDown = (e: MouseEvent) => {
    startX = e.clientX
    startLeftWidth = left.getBoundingClientRect().width

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const onMouseMove = (e: MouseEvent) => {
    const dx = e.clientX - startX
    const newWidth = Math.max(200, startLeftWidth + dx)
    const containerWidth = left.parentElement?.getBoundingClientRect().width ?? 0
    const maxWidth = containerWidth - 200 - 6 // 6 for resizer

    const clampedWidth = Math.min(newWidth, maxWidth)
    left.style.width = `${clampedWidth}px`
    left.style.flex = 'none'
  }

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  resizer.addEventListener('mousedown', onMouseDown)
}

/**
 * Get the current source content from CodeMirror.
 */
export function getSplitViewContent(): string {
  if (!state.cmView) return ''
  return state.cmView.state.doc.toString()
}

/**
 * Set content in the CodeMirror editor.
 */
export function setSplitViewContent(content: string) {
  if (!state.cmView) return
  state.cmView.dispatch({
    changes: { from: 0, to: state.cmView.state.doc.length, insert: content },
  })
}

/**
 * Destroy the split view and clean up resources.
 */
export async function destroySplitView(): Promise<void> {
  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer)
    state.debounceTimer = null
  }

  if (state.cmView) {
    state.cmView.destroy()
    state.cmView = null
  }

  if (state.previewEditor) {
    await state.previewEditor.destroy()
    state.previewEditor = null
  }

  if (state.container) {
    state.container.innerHTML = ''
  }

  state.container = null
  state.previewContainer = null
  state.isSyncing = false
}

/**
 * Check if split view is active.
 */
export function isSplitViewActive(): boolean {
  return state.cmView !== null
}
