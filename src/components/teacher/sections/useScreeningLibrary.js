import { useCallback, useEffect, useRef, useState } from 'react'
import { diagnosticRequest } from './diagnosticRequest'

// Screening lists per class, read only for the classes a tab needs
// (docs/STYRNING_BELASTNING.md, step 2): every class for the issued list, the
// picked recipients' classes when creating, none for results and drafts, which
// read their own. Lists already read are kept until `reload`.
export default function useScreeningLibrary(classes, active = true, wantAll = false) {
  const [loaded, setLoaded] = useState({})
  const [revision, setRevision] = useState(0)
  const [requested, setRequested] = useState([])
  const started = useRef(new Set())
  const known = classes.map(item => String(item.id))
  const wantedKey = (wantAll ? known : requested.filter(id => known.includes(id))).sort().join(',')
  const reload = useCallback(() => {
    started.current = new Set()
    setLoaded({})
    setRevision(value => value + 1)
  }, [])
  // The dispatch flow asks for its recipients' classes.
  const request = useCallback(classIds => setRequested(previous => {
    const next = [...new Set([...previous, ...classIds.map(String)])]
    return next.length === previous.length ? previous : next
  }), [])
  // A read belongs to the reload round it started in; asking for more classes
  // never cancels lists that are already on their way.
  const round = useRef(0)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { round.current = revision }, [revision])
  useEffect(() => {
    if (!active) return
    const mine = revision
    const missing = wantedKey.split(',').filter(id => id && !started.current.has(id))
    for (const classId of missing) started.current.add(classId)
    for (const classId of missing) {
      void diagnosticRequest(`/api/teacher-diagnostic-assignments?classId=${encodeURIComponent(classId)}`).then(result => ({ classId, entry: result.ok
        ? { assignments: (result.data.assignments || []).map(item => ({ ...item, classId })),
          allowed: result.data.testStudentIds || [], wholeClassAvailable: Boolean(result.data.wholeClassAvailable) }
        : { assignments: [], allowed: [], error: result.status === 404 ? 'Screening är inte aktiverat på servern.' : result.data.error || 'Kunde inte läsa klassen.' } }),
      () => ({ classId, entry: { assignments: [], allowed: [], error: 'Kunde inte nå servern.' } }))
        .then(({ classId: id, entry }) => {
          if (mounted.current && round.current === mine) setLoaded(previous => ({ ...previous, [id]: entry }))
        })
    }
  }, [wantedKey, revision, active])
  return { loaded, reload, request, revision, assignments: Object.values(loaded).flatMap(item => item.assignments),
    loading: wantedKey.split(',').filter(Boolean).some(id => !loaded[id]) }
}
