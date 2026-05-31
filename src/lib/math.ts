import { $nodeSchema, $view } from '@milkdown/utils'
import type { Node } from '@milkdown/prose/model'
import type { EditorView, NodeView, NodeViewConstructor } from '@milkdown/prose/view'
import katex from 'katex'

// ===== Block Math Node =====

export const mathBlockSchema = $nodeSchema('math', () => {
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
        tag: 'div[data-math-block]',
        getAttrs: (dom) => {
          if (!(dom instanceof HTMLElement)) throw new Error('Expected HTMLElement')
          return { value: dom.dataset.value || dom.textContent || '' }
        },
      },
    ],
    toDOM: (node) => {
      return [
        'div',
        { 'data-math-block': '', 'data-value': node.attrs.value },
        node.attrs.value,
      ]
    },
    parseMarkdown: {
      match: ({ type }) => type === 'math',
      runner: (state, node, type) => {
        const value = (node.value as string) || ''
        state.openNode(type, { value })
        if (value) state.addText(value)
        state.closeNode()
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === 'math',
      runner: (state, node) => {
        state.addNode('math', undefined, node.attrs.value || node.textContent)
      },
    },
  }
})

// ===== Inline Math Node =====

export const mathInlineSchema = $nodeSchema('inlineMath', () => {
  return {
    content: 'text*',
    group: 'inline',
    inline: true,
    marks: '',
    atom: true,
    attrs: {
      value: { default: '' },
    },
    parseDOM: [
      {
        tag: 'span[data-math-inline]',
        getAttrs: (dom) => {
          if (!(dom instanceof HTMLElement)) throw new Error('Expected HTMLElement')
          return { value: dom.dataset.value || dom.textContent || '' }
        },
      },
    ],
    toDOM: (node) => {
      return [
        'span',
        { 'data-math-inline': '', 'data-value': node.attrs.value },
        node.attrs.value,
      ]
    },
    parseMarkdown: {
      match: ({ type }) => type === 'inlineMath',
      runner: (state, node, type) => {
        const value = (node.value as string) || ''
        state.addNode(type, { value })
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === 'inlineMath',
      runner: (state, node) => {
        state.addNode('inlineMath', undefined, node.attrs.value || node.textContent)
      },
    },
  }
})

// ===== KaTeX Node View (Block) =====

class MathBlockView implements NodeView {
  dom: HTMLElement
  private node: Node
  private view: EditorView
  private getPos: () => number | undefined
  private editing = false
  private textarea: HTMLTextAreaElement | null = null

  constructor(node: Node, view: EditorView, getPos: () => number | undefined) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.dom = document.createElement('div')
    this.dom.className = 'math-block-view'
    this.dom.setAttribute('data-math-block', '')
    this.render()
  }

  private render() {
    const value = this.node.attrs.value as string
    if (!value) {
      this.dom.innerHTML = '<span class="math-empty">点击输入公式...</span>'
      return
    }
    try {
      katex.render(value, this.dom, {
        displayMode: true,
        throwOnError: false,
        trust: true,
      })
    } catch {
      this.dom.innerHTML = `<span class="math-error">${value}</span>`
    }
  }

  private enterEdit() {
    this.editing = true
    const value = this.node.attrs.value as string
    this.textarea = document.createElement('textarea')
    this.textarea.className = 'math-edit-textarea'
    this.textarea.value = value
    this.textarea.spellcheck = false
    this.textarea.addEventListener('blur', () => this.exitEdit())
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.exitEdit()
      }
      // Prevent editor shortcuts while editing math
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

    // Update node if value changed
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
    // Stop keyboard events when editing
    if (this.editing && e instanceof KeyboardEvent) return true
    // Allow click to enter edit mode
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
    if (node.type.name !== 'math') return false
    this.node = node
    if (!this.editing) this.render()
    return true
  }

  destroy() {
    this.textarea = null
  }
}

// ===== KaTeX Node View (Inline) =====

class MathInlineView implements NodeView {
  dom: HTMLElement
  private node: Node
  private view: EditorView
  private getPos: () => number | undefined
  private editing = false
  private input: HTMLInputElement | null = null

  constructor(node: Node, view: EditorView, getPos: () => number | undefined) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.dom = document.createElement('span')
    this.dom.className = 'math-inline-view'
    this.dom.setAttribute('data-math-inline', '')
    this.render()
  }

  private render() {
    const value = this.node.attrs.value as string
    if (!value) {
      this.dom.innerHTML = '<span class="math-empty">公式</span>'
      return
    }
    try {
      katex.render(value, this.dom, {
        displayMode: false,
        throwOnError: false,
        trust: true,
      })
    } catch {
      this.dom.innerHTML = `<span class="math-error">${value}</span>`
    }
  }

  private enterEdit() {
    this.editing = true
    const value = this.node.attrs.value as string
    this.input = document.createElement('input')
    this.input.type = 'text'
    this.input.className = 'math-edit-input'
    this.input.value = value
    this.input.spellcheck = false
    this.input.addEventListener('blur', () => this.exitEdit())
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        this.exitEdit()
      }
      e.stopPropagation()
    })
    this.dom.innerHTML = ''
    this.dom.appendChild(this.input)
    this.input.focus()
    this.input.select()
  }

  private exitEdit() {
    if (!this.editing || !this.input) return
    this.editing = false
    const newValue = this.input.value
    this.input = null

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
    if (node.type.name !== 'inlineMath') return false
    this.node = node
    if (!this.editing) this.render()
    return true
  }

  destroy() {
    this.input = null
  }
}

// ===== Views =====

export const mathBlockView = $view(mathBlockSchema.node, (): NodeViewConstructor => {
  return (node, view, getPos) => new MathBlockView(node, view, getPos)
})

export const mathInlineView = $view(mathInlineSchema.node, (): NodeViewConstructor => {
  return (node, view, getPos) => new MathInlineView(node, view, getPos)
})

// ===== All math plugins =====

export const math = [
  mathBlockSchema,
  mathInlineSchema,
  mathBlockView,
  mathInlineView,
].flat()
