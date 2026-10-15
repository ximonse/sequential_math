import { useEffect, useState } from 'react'
import { loadTeacherProfile } from '../../../lib/storage'
import { loadAttentionGroup } from './attentionGroup'

export default function useAttentionGroup(students) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ source: null, revision: -1, records: {} })
  useEffect(() => {
    let active = true
    void loadAttentionGroup(students, loadTeacherProfile, (id, record) => {
      setState(previous => ({ source: students, revision,
        records: { ...(previous.source === students && previous.revision === revision ? previous.records : {}), [id]: record } }))
    }, () => active)
    return () => { active = false }
  }, [students, revision])
  return {
    records: state.source === students && state.revision === revision ? state.records : {},
    refresh: () => setRevision(value => value + 1)
  }
}
