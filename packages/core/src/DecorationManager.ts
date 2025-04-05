import { type EditorState, type Transaction,Plugin, PluginKey } from '@tiptap/pm/state'
import { type EditorView, Decoration, DecorationSet } from '@tiptap/pm/view'

import type { Editor } from './Editor'
import type { Extension } from './Extension'
import type { DecorationItem, DecorationOptions } from './types'

export const decorationPluginKey = new PluginKey('__tiptap_decorations')

export class DecorationManager {
  editor: Editor

  extensions: Extension[]

  decorationConfigs: Record<string, DecorationOptions> = {}

  constructor(props: { editor: Editor; extensions: Extension[] }) {
    this.extensions = props.extensions
    this.editor = props.editor

    this.extensions.forEach(ext => {
      if (ext.config.decorations) {
        this.decorationConfigs[ext.name] = ext.config.decorations({ editor: this.editor })
      }
    })
  }

  createPlugin() {
    return new Plugin({
      key: decorationPluginKey,

      state: {
        init: () => {
          return this.createDecorations(this.editor.state, this.editor.view)
        },

        apply: (tr, decorationSet, oldState, newState) => {
          if (!this.needsRecreation(tr, oldState, newState)) {
            return decorationSet.map(tr.mapping, tr.doc)
          }

          const newDecorations = this.createDecorations(newState, this.editor.view)

          // check if new decorations are the same as old decorations
          if (decorationSet.find().length === newDecorations.find().length) {
            const oldDecorations = decorationSet.find()
            const newDecorationsArray = newDecorations.find()
            const isSame = oldDecorations.every((oldDec, index) => {
              const newDec = newDecorationsArray[index]
              return oldDec.from === newDec.from && oldDec.to === newDec.to && oldDec.spec === newDec.spec
            })
            if (isSame) {
              return decorationSet
            }
          }

          // if not recreate the decoration set
          return this.createDecorations(newState, this.editor.view)
        },
      },

      props: {
        decorations(state) {
          return this.getState(state)
          // return this.createDecorations(state, this.editor.view)
        },
      },
    })
  }

  createDecorations(state: EditorState, view: EditorView) {
    let items: DecorationItem[] = []

    const extNames = Object.keys(this.decorationConfigs)

    extNames.forEach(name => {
      const config = this.decorationConfigs[name]

      if (!config.create) {
        return
      }

      const decos = config.create({
        state,
        view,
        editor: this.editor,
      })

      if (!decos) {
        return
      }

      items = items ? [...items, ...decos] : decos
    })

    const decorations = items.map(item => {
      switch (item.type) {
        case 'node':
          return Decoration.node(item.from, item.to, item.attributes || {})
        case 'inline':
          return Decoration.inline(item.from, item.to, item.attributes || {})
        case 'widget':
          if (!item.widget) {
            throw new Error('Widget decoration requires a widget property')
          }

          return Decoration.widget(item.from, item.widget)
        default:
          throw new Error(`Unknown decoration type: ${item.type}`)
      }
    })

    return DecorationSet.create(state.doc, decorations)
  }

  needsRecreation(tr: Transaction, oldState: EditorState, newState: EditorState) {
    let needsRecreation = false

    const names = Object.keys(this.decorationConfigs)

    names.forEach(name => {
      const config = this.decorationConfigs[name]

      if (
        config.requiresUpdate &&
        config.requiresUpdate({
          tr,
          oldState,
          newState,
        })
      ) {
        needsRecreation = true
      }
    })

    return needsRecreation
  }
}
