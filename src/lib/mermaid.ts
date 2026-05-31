// @ts-nocheck - mermaid types
import { $nodeSchema, $view } from '@milkdown/utils'
import type { Node } from '@milkdown/prose/model'
import type { EditorView, NodeView, NodeViewConstructor } from '@milkdown/prose/view'

// ===== Mermaid Node Schema =====

export const mermaidDiagramSchema = $nodeSchema('mermaidDiagram', () => {
  return {
    content: 'text*',
    group: 'block',
    code: true,
    defining: true,
    marks: '',
    attrs: {
      value: { default: '' },
    },
    parseDOM: [
      {
        tag: 'div[data-mermaid]',
        getAttrs: (dom) => {
          if (!(dom instanceof HTMLElement)) throw new Error('Expected HTMLElement')
          return { value: dom.dataset.value || dom.textContent || '' }
        },
      },
    ],
    toDOM: (node) => {
      return [
        'div',
        { 'data-mermaid': '', 'data-value': node.attrs.value },
        node.attrs.value,
      ]
    },
    parseMarkdown: {
      match: ({ type, lang }) => type === 'code' && lang === 'mermaid',
      runner: (state, node, type) => {
        const value = (node.value as string) || ''
        state.openNode(type, { value })
        if (value) state.addText(value)
        state.closeNode()
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === 'mermaidDiagram',
      runner: (state, node) => {
        state.addNode('code', undefined, node.attrs.value || node.textContent, {
          lang: 'mermaid',
        })
      },
    },
  }
})

// ===== Remark Plugin: Transform mermaid code blocks =====
// This is handled by parseMarkdown match above, no separate remark plugin needed

// ===== Mermaid Node View =====

let mermaidIdCounter = 0

class MermaidDiagramView implements NodeView {
  dom: HTMLElement
  private node: Node
  private view: EditorView
  private getPos: () => number | undefined
  private editing = false
  private textarea: HTMLTextAreaElement | null = null
  private renderedSvg = ''
  private renderError = ''
  private renderId: string

  constructor(node: Node, view: EditorView, getPos: () => number | undefined) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.renderId = `mermaid-${++mermaidIdCounter}-${Date.now()}`
    this.dom = document.createElement('div')
    this.dom.className = 'mermaid-diagram-view'
    this.dom.setAttribute('data-mermaid', '')
    this.render()
  }

  private async render() {
    const value = this.node.attrs.value as string
    if (!value) {
      this.dom.innerHTML = '<span class="mermaid-empty">点击输入 Mermaid 图表...</span>'
      return
    }

    try {
      // Dynamic import mermaid to avoid loading it upfront
      const mermaidModule = await import('mermaid') as any
      const mermaid = mermaidModule.default || mermaidModule
      mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
        securityLevel: 'strict',
      })

      const { svg } = await mermaid.render(this.renderId, value)
      this.renderedSvg = svg
      this.renderError = ''
      this.dom.innerHTML = svg
      this.dom.classList.remove('mermaid-error')
    } catch (err) {
      this.renderError = err instanceof Error ? err.message : String(err)
      this.dom.innerHTML = `<div class="mermaid-error-content">
        <span class="mermaid-error-icon">⚠</span>
        <span class="mermaid-error-text">${this.renderError}</span>
      </div>`
      this.dom.classList.add('mermaid-error')
    }
  }

  private enterEdit() {
    this.editing = true
    const value = this.node.attrs.value as string
    this.textarea = document.createElement('textarea')
    this.textarea.className = 'mermaid-edit-textarea'
    this.textarea.value = value
    this.textarea.spellcheck = false
    this.textarea.rows = Math.max(6, value.split('\n').length)
    this.textarea.addEventListener('blur', () => this.exitEdit())
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.exitEdit()
      }
      e.stopPropagation()
    })
    this.dom.innerHTML = ''
    this.dom.appendChild(this.textarea)
    this.textarea.focus()
    this.textarea.select()
  }

  private exitEdit() {
    if (!this.editing || !this.textarea) return
    this.editing = false
    const newValue = this.textarea.value
    this.textarea = null

    if (newValue !== this.node.attrs.value) {
      const pos = this.getPos()
      if (pos !== undefined) {
        const tr = this.view.state.tr.setNodeAttribute(pos, 'value', newValue)
        this.view.dispatch(tr)
      }
    }
    this.render()
  }

  selectNode() {
    this.dom.classList.add('ProseMirror-selectednode')
  }

  deselectNode() {
    this.dom.classList.remove('ProseMirror-selectednode')
  }

  stopEvent(e: Event) {
    if (this.editing && e instanceof KeyboardEvent) return true
    if (e.type === 'dblclick') {
      this.enterEdit()
      return true
    }
    return false
  }

  ignoreMutation() {
    return true
  }

  update(node: Node) {
    if (node.type.name !== 'mermaidDiagram') return false
    this.node = node
    if (!this.editing) this.render()
    return true
  }

  destroy() {
    this.textarea = null
  }
}

// ===== View =====

export const mermaidDiagramView = $view(mermaidDiagramSchema.node, (): NodeViewConstructor => {
  return (node, view, getPos) => new MermaidDiagramView(node, view, getPos)
})

// ===== All mermaid plugins =====

export const mermaid = [
  mermaidDiagramSchema,
  mermaidDiagramView,
].flat()
