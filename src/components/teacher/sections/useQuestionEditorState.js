import { useState } from 'react'

// The collection owns editor state when it needs to persist unfinished work.
export function useQuestionEditorState(value, onChange, empty) {
  const [local, setLocal] = useState(() => ({ draft: empty(), editing: -1 }))
  const state = value ?? local, setState = onChange ?? setLocal
  const set = field => value => setState(previous => ({ ...previous,
    [field]: typeof value === 'function' ? value(previous[field]) : value }))
  return [state.draft, set('draft'), state.editing, set('editing')]
}
