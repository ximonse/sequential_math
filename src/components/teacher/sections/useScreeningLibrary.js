import { useCallback, useEffect, useState } from 'react'
import { diagnosticRequest } from './diagnosticRequest'

export default function useScreeningLibrary(classes, active = true) {
  const [loaded, setLoaded] = useState({})
  const [revision, setRevision] = useState(0)
  const classKey = classes.map(item => String(item.id)).sort().join(',')
  const reload = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    if (!active) return undefined
    let current = true
    setLoaded({})
    void Promise.all(classKey.split(',').filter(Boolean).map(async classId => {
      try {
        const result = await diagnosticRequest(`/api/teacher-diagnostic-assignments?classId=${encodeURIComponent(classId)}`)
        if (!current) return
        setLoaded(previous => ({ ...previous, [classId]: result.ok
          ? { assignments: (result.data.assignments || []).map(item => ({ ...item, classId })),
            allowed: result.data.testStudentIds || [], wholeClassAvailable: Boolean(result.data.wholeClassAvailable) }
          : { assignments: [], allowed: [], error: result.status === 404 ? 'Screening är inte aktiverat på servern.' : result.data.error || 'Kunde inte läsa klassen.' } }))
      } catch {
        if (current) setLoaded(previous => ({ ...previous, [classId]: { assignments: [], allowed: [], error: 'Kunde inte nå servern.' } }))
      }
    }))
    return () => { current = false }
  }, [classKey, revision, active])
  return { loaded, reload, revision, assignments: Object.values(loaded).flatMap(item => item.assignments),
    loading: classKey.split(',').filter(Boolean).some(id => !loaded[id]) }
}
