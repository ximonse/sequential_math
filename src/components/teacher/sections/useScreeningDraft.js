import { useState } from 'react'
import { diagnosticCatalog } from '../../../domains/arithmetic/diagnosticCatalog.browser'
import { emptyScreeningDraft } from '../../../domains/arithmetic/screeningDraft'

export default function useScreeningDraft() {
  const [draft, setDraft] = useState(() => ({ ...emptyScreeningDraft(), selectedTasks: [diagnosticCatalog.tasks[0].taskId] }))
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  return { draft, setDraft, busy, setBusy, dirty, setDirty }
}
