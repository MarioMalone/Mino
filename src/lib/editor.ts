import { Editor, rootCtx, defaultValueCtx, editorViewCtx, serializerCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import type { Editor as MilkdownEditor } from '@milkdown/core'

let editorInstance: MilkdownEditor | null = null

export async function createEditor(
  container: HTMLElement | string,
  content: string
): Promise<MilkdownEditor> {
  if (editorInstance) {
    await editorInstance.destroy()
  }

  editorInstance = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, container)
      ctx.set(defaultValueCtx, content)
    })
    .use(commonmark)
    .use(gfm)
    .create()

  return editorInstance
}

export async function destroyEditor(): Promise<void> {
  if (editorInstance) {
    await editorInstance.destroy()
    editorInstance = null
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
  if (!editorInstance) return
  await editorInstance.destroy()
  const container = editorInstance.container
  editorInstance = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, container)
      ctx.set(defaultValueCtx, content)
    })
    .use(commonmark)
    .use(gfm)
    .create()
}
