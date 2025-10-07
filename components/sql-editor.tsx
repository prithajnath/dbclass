"use client"

import { useEffect, useRef } from "react"
import { EditorView, basicSetup } from "codemirror"
import { sql, SQLDialect } from "@codemirror/lang-sql"
import { oneDark } from "@codemirror/theme-one-dark"
import { Compartment } from "@codemirror/state"

interface SQLEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function SQLEditor({ value, onChange, disabled = false }: SQLEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const editableCompartment = useRef(new Compartment())

  useEffect(() => {
    if (!editorRef.current) return

    const view = new EditorView({
      doc: value,
      extensions: [
        basicSetup,
        sql({ dialect: SQLDialect.SQLite }),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString())
          }
        }),
        editableCompartment.current.of(EditorView.editable.of(!disabled)),
        EditorView.theme({
          "&": {
            height: "200px",
            fontSize: "14px",
          },
          ".cm-scroller": {
            overflow: "auto",
            fontFamily: '"Courier New", Courier, "Lucida Console", Monaco, monospace',
          },
          ".cm-content": {
            minHeight: "200px",
            fontFamily: '"Courier New", Courier, "Lucida Console", Monaco, monospace',
          },
        }),
      ],
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [])

  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString()
      if (currentValue !== value) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentValue.length, insert: value },
        })
      }
    }
  }, [value])

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: editableCompartment.current.reconfigure(EditorView.editable.of(!disabled)),
      })
    }
  }, [disabled])

  return <div ref={editorRef} className="border rounded-md overflow-hidden" />
}
