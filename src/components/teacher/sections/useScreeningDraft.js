import { useState } from 'react'
import { emptyScreeningDraft } from '../../../domains/arithmetic/screeningDraft'

export default function useScreeningDraft() {
  const [draft, setDraft] = useState(() => emptyScreeningDraft())
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  return { draft, setDraft, busy, setBusy, dirty, setDirty }
}
