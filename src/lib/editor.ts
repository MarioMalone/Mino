// @ts-nocheck - Milkdown API types are not fully compatible with strict mode
import { Editor, rootCtx, defaultValueCtx, editorViewCtx, serializerCtx, remarkPluginsCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { history } from '@milkdown/prose/history'
import { redo, undo } from '@milkdown/prose/history'
import { keymap } from '@milkdown/prose/keymap'
import { toggleMark } from '@milkdown/prose/commands'
import { prosePluginsCtx } from '@milkdown/core'
import { Plugin, PluginKey, TextSelection } from '@milkdown/prose/state'
import { DecorationSet, Decoration } from '@milkdown/prose/view'
import type { Editor as MilkdownEditor, Ctx } from '@milkdown/core'
export type { MilkdownEditor }
import type { EditorView } from '@milkdown/prose/view'
import type { Transaction } from '@milkdown/prose/state'
import { highlight, highlightPluginConfig } from '@milkdown/plugin-highlight'
import { createParser } from '@milkdown/plugin-highlight/lowlight'
import { common, createLowlight } from 'lowlight'
import remarkMath from 'remark-math'
import { math } from './math'
import { mermaid } from './mermaid'

let editorInstance: MilkdownEditor | null = null
let currentContainer: HTMLElement | null = null
let onChangeCallback: (() => void) | null = null

// Create lowlight instance with common languages
const lowlight = createLowlight(common)
const highlightParser = createParser(lowlight)

const changePluginKey = new PluginKey('mino-change-listener')

function createChangePlugin() {
  return new Plugin({
    key: changePluginKey,
    appendTransaction: (_transactions, _oldState, newState) => {
      // Fire callback on any transaction that changes the document
      if (_transactions.some(tr => tr.docChanged) && onChangeCallback) {
        onChangeCallback()
      }
      return null
    },
  })
}

// ===== Search Plugin =====

interface SearchMatch {
  from: number
  to: number
}

interface SearchState {
  query: string
  useRegex: boolean
  caseSensitive: boolean
  matches: SearchMatch[]
  currentIndex: number
  decorations: DecorationSet
}

const searchPluginKey = new PluginKey('mino-search')

function findMatches(doc: any, query: string, useRegex: boolean, caseSensitive: boolean): SearchMatch[] {
  if (!query) return []
  const matches: SearchMatch[] = []
  const textContent = doc.textBetween(0, doc.content.size, '�')

  let regex: RegExp
  try {
    const flags = caseSensitive ? 'g' : 'gi'
    regex = useRegex ? new RegExp(query, flags) : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
  } catch {
    return []
  }

  let match: RegExpExecArray | null
  while ((match = regex.exec(textContent)) !== null) {
    const from = match.index
    const to = from + match[0].length
    if (match[0].length > 0) {
      matches.push({ from, to })
    }
  }

  return matches
}

function createDecorations(doc: any, matches: SearchMatch[], currentIndex: number): DecorationSet {
  const decorations = matches.map((m, i) => {
    const className = i === currentIndex ? 'mino-search-match-current' : 'mino-search-match'
    return Decoration.inline(m.from, m.to, { class: className })
  })
  return DecorationSet.create(doc, decorations)
}

function createSearchPlugin() {
  return new Plugin<SearchState>({
    key: searchPluginKey,
    state: {
      init(): SearchState {
        return { query: '', useRegex: false, caseSensitive: false, matches: [], currentIndex: -1, decorations: DecorationSet.empty }
      },
      apply(tr: Transaction, oldState: SearchState): SearchState {
        const meta = tr.getMeta(searchPluginKey)
        if (meta) {
          return meta as SearchState
        }
        // If doc changed, re-search
        if (tr.docChanged && oldState.query) {
          const matches = findMatches(tr.doc, oldState.query, oldState.useRegex, oldState.caseSensitive)
          const currentIndex = Math.min(oldState.currentIndex, matches.length - 1)
          const decorations = createDecorations(tr.doc, matches, currentIndex)
          return { ...oldState, matches, currentIndex, decorations }
        }
        return oldState
      },
    },
    props: {
      decorations(state) {
        return searchPluginKey.getState(state)?.decorations ?? DecorationSet.empty
      },
    },
  })
}

export function searchInEditor(query: string, useRegex: boolean, caseSensitive: boolean): number {
  if (!editorInstance) return 0
  return editorInstance.action((ctx: Ctx) => {
    const view = ctx.get(editorViewCtx)
    const matches = findMatches(view.state.doc, query, useRegex, caseSensitive)
    const currentIndex = matches.length > 0 ? 0 : -1
    const decorations = createDecorations(view.state.doc, matches, currentIndex)
    const tr = view.state.tr.setMeta(searchPluginKey, { query, useRegex, caseSensitive, matches, currentIndex, decorations })
    view.dispatch(tr)
    if (currentIndex >= 0) {
      scrollToMatch(view, matches[0])
    }
    return matches.length
  })
}

export function clearSearch(): void {
  if (!editorInstance) return
  editorInstance.action((ctx: Ctx) => {
    const view = ctx.get(editorViewCtx)
    const tr = view.state.tr.setMeta(searchPluginKey, { query: '', useRegex: false, caseSensitive: false, matches: [], currentIndex: -1, decorations: DecorationSet.empty })
    view.dispatch(tr)
  })
}

export function findNext(): boolean {
  if (!editorInstance) return false
  return editorInstance.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const state = searchPluginKey.getState(view.state)
    if (!state || state.matches.length === 0) return false
    const nextIndex = (state.currentIndex + 1) % state.matches.length
    const decorations = createDecorations(view.state.doc, state.matches, nextIndex)
    const tr = view.state.tr.setMeta(searchPluginKey, { ...state, currentIndex: nextIndex, decorations })
    view.dispatch(tr)
    scrollToMatch(view, state.matches[nextIndex])
    return true
  })
}

export function findPrev(): boolean {
  if (!editorInstance) return false
  return editorInstance.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const state = searchPluginKey.getState(view.state)
    if (!state || state.matches.length === 0) return false
    const prevIndex = (state.currentIndex - 1 + state.matches.length) % state.matches.length
    const decorations = createDecorations(view.state.doc, state.matches, prevIndex)
    const tr = view.state.tr.setMeta(searchPluginKey, { ...state, currentIndex: prevIndex, decorations })
    view.dispatch(tr)
    scrollToMatch(view, state.matches[prevIndex])
    return true
  })
}

export function replaceCurrent(replacement: string): boolean {
  if (!editorInstance) return false
  return editorInstance.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const state = searchPluginKey.getState(view.state)
    if (!state || state.matches.length === 0 || state.currentIndex < 0) return false
    const match = state.matches[state.currentIndex]
    const tr = view.state.tr.replaceWith(match.from, match.to, view.state.schema.text(replacement))
    view.dispatch(tr)
    return true
  })
}

export function replaceAll(replacement: string): number {
  if (!editorInstance) return 0
  return editorInstance.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const state = searchPluginKey.getState(view.state)
    if (!state || state.matches.length === 0) return 0
    let tr = view.state.tr
    // Replace in reverse order to preserve positions
    for (let i = state.matches.length - 1; i >= 0; i--) {
      const match = state.matches[i]
      tr = tr.replaceWith(match.from, match.to, view.state.schema.text(replacement))
    }
    view.dispatch(tr)
    return state.matches.length
  })
}

function scrollToMatch(view: EditorView, match: SearchMatch) {
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, match.from)))
  // Scroll into view
  const coords = view.coordsAtPos(match.from)
  if (coords) {
    const editorDom = view.dom
    const editorRect = editorDom.getBoundingClientRect()
    if (coords.top < editorRect.top || coords.bottom > editorRect.bottom) {
      view.domAtPos(match.from)
      // Use scrollIntoView on the DOM node
      const domNode = view.domAtPos(match.from)
      if (domNode.node instanceof HTMLElement) {
        domNode.node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }
}

export async function createEditor(
  container: HTMLElement | string,
  content: string
): Promise<MilkdownEditor> {
  if (editorInstance) {
    await editorInstance.destroy()
    editorInstance = null
  }

  currentContainer = typeof container === 'string'
    ? document.querySelector(container) as HTMLElement
    : container

  if (!currentContainer) {
    throw new Error('Editor container not found')
  }

  // Clear container content before creating editor
  currentContainer.innerHTML = ''

  editorInstance = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, currentContainer!)
      ctx.set(defaultValueCtx, content)

      // Configure highlight plugin
      ctx.set(highlightPluginConfig.key, {
        parser: highlightParser,
      })

      // Add remark-math plugin for KaTeX support
      ctx.update(remarkPluginsCtx, (prev) => [...prev, remarkMath as any])

      // Add history plugin (undo/redo) and custom keymap
      ctx.update(prosePluginsCtx, (prev) => [
        ...prev,
        history(),
        keymap({
          'Mod-z': undo,
          'Mod-y': redo,
          'Shift-Mod-z': redo,
        }),
        createChangePlugin(),
        createSearchPlugin(),
      ])
    })
    .use(commonmark)
    .use(gfm)
    .use(highlight)
    .use(math)
    .use(mermaid)
    .create()

  return editorInstance
}

export async function destroyEditor(): Promise<void> {
  if (editorInstance) {
    await editorInstance.destroy()
    editorInstance = null
    currentContainer = null
    onChangeCallback = null
  }
}

export function getEditorMarkdown(): string {
  if (!editorInstance) return ''
  return editorInstance.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const serializer = ctx.get(serializerCtx)
    return serializer(view.state.doc)
  })
}

export async function setEditorMarkdown(content: string): Promise<void> {
  if (!editorInstance || !currentContainer) return
  await editorInstance.destroy()
  editorInstance = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, currentContainer!)
      ctx.set(defaultValueCtx, content)

      ctx.set(highlightPluginConfig.key, {
        parser: highlightParser,
      })

      ctx.update(remarkPluginsCtx, (prev) => [...prev, remarkMath as any])

      ctx.update(prosePluginsCtx, (prev) => [
        ...prev,
        history(),
        keymap({
          'Mod-z': undo,
          'Mod-y': redo,
          'Shift-Mod-z': redo,
        }),
        createChangePlugin(),
        createSearchPlugin(),
      ])
    })
    .use(commonmark)
    .use(gfm)
    .use(highlight)
    .use(math)
    .use(mermaid)
    .create()
}

// ===== Formatting Commands =====

function withEditorView(fn: (view: EditorView) => void): void {
  if (!editorInstance) return
  editorInstance.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    fn(view)
  })
}

/** Toggle bold mark: Ctrl+B */
export function toggleBold(): void {
  withEditorView((view) => {
    const markType = view.state.schema.marks.strong
    if (markType) {
      toggleMark(markType)(view.state, view.dispatch)
      view.focus()
    }
  })
}

/** Toggle italic mark: Ctrl+I */
export function toggleItalic(): void {
  withEditorView((view) => {
    const markType = view.state.schema.marks.em
    if (markType) {
      toggleMark(markType)(view.state, view.dispatch)
      view.focus()
    }
  })
}

/** Toggle inline code mark: Ctrl+` */
export function toggleCode(): void {
  withEditorView((view) => {
    const markType = view.state.schema.marks.code_inline
    if (markType) {
      toggleMark(markType)(view.state, view.dispatch)
      view.focus()
    }
  })
}

/** Toggle strikethrough mark: Alt+Shift+5 */
export function toggleStrikethrough(): void {
  withEditorView((view) => {
    const markType = view.state.schema.marks.strike_through
    if (markType) {
      toggleMark(markType)(view.state, view.dispatch)
      view.focus()
    }
  })
}

/** Get current editor view (for external use) */
export function getEditorView(): EditorView | null {
  if (!editorInstance) return null
  return editorInstance.action((ctx) => ctx.get(editorViewCtx))
}

/** Get editor instance */
export function getEditorInstance(): MilkdownEditor | null {
  return editorInstance
}

/** Register a callback for editor content changes */
export function onEditorChange(callback: () => void): void {
  onChangeCallback = callback
}

/** Clear the change callback */
export function offEditorChange(): void {
  onChangeCallback = null
}

// ===== Outline Navigation =====

export interface OutlineItem {
  level: number
  text: string
  pos: number
}

export function getOutlineItems(): OutlineItem[] {
  if (!editorInstance) return []
  return editorInstance.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const items: OutlineItem[] = []
    view.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        items.push({
          level: node.attrs.level,
          text: node.textContent,
          pos,
        })
      }
    })
    return items
  })
}

export function scrollToPosition(pos: number): void {
  if (!editorInstance) return
  editorInstance.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)))
    // Scroll into view
    const domNode = view.domAtPos(pos)
    if (domNode.node instanceof HTMLElement) {
      domNode.node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

/** Insert text at current cursor position */
export function insertTextAtCursor(text: string): void {
  if (!editorInstance) return
  editorInstance.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { from } = view.state.selection
    const tr = view.state.tr.insertText(text, from)
    view.dispatch(tr)
    view.focus()
  })
}
