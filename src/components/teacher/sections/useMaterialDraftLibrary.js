import { useEffect, useState } from 'react'
import { diagnosticRequest } from './diagnosticRequest.js'

export default function useMaterialDraftLibrary(revision) {
  const [state, setState] = useState({ drafts: [], loading: true, error: '' })
  useEffect(() => {
    let active = true
    setState({ drafts: [], loading: true, error: '' })
    async function load() {
      const drafts = [], offsets = new Set()
      let offset = 0, indexRevision
      do {
        if (offsets.has(offset) || offsets.size >= 5) throw Error('Listan ändrades. Läs om materialet.')
        offsets.add(offset)
        const query = new URLSearchParams({ resource: 'drafts', limit: 20, offset,
          ...(indexRevision ? { indexRevision } : {}) })
        const result = await diagnosticRequest(`/api/teacher-material?${query}`)
        if (!active) return
        if (!result.ok) throw Error(result.data.error || 'Kunde inte läsa materialutkasten.')
        if (!Array.isArray(result.data.drafts) || !result.data.indexRevision
          || (indexRevision && indexRevision !== result.data.indexRevision)) throw Error('Listan ändrades. Läs om materialet.')
        indexRevision = result.data.indexRevision
        drafts.push(...result.data.drafts)
        const next = result.data.nextOffset
        if (next !== null && (!Number.isSafeInteger(next) || next <= offset || next >= 100)) throw Error('Listan ändrades. Läs om materialet.')
        offset = next
      } while (offset !== null)
      if (active) setState({ drafts: drafts.sort((a, b) => b.updatedAt - a.updatedAt), loading: false, error: '' })
    }
    load().catch(error => { if (active) setState({ drafts: [], loading: false, error: error.message || 'Kunde inte läsa materialutkasten.' }) })
    return () => { active = false }
  }, [revision])
  return state
}
