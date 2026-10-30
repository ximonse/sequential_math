import { useEffect, useState } from 'react'
import { diagnosticRequest } from './diagnosticRequest'

const labels = { submitted: 'Inlämnad', in_progress: 'Pågående', not_started: 'Ej påbörjad' }

export default function ScreeningCompletion({ members, revision, names }) {
  const [state, setState] = useState({ loading: true })
  const scopeKey = JSON.stringify(members.map(member => ({ classId: member.classId, assignmentId: member.assignmentId, studentIds: member.studentIds })))
  useEffect(() => {
    let active = true
    setState({ loading: true })
    const scope = JSON.parse(scopeKey)
    Promise.all(scope.map(async member => {
      const result = await diagnosticRequest(`/api/teacher-diagnostic-attempts?classId=${encodeURIComponent(member.classId)}&assignmentId=${encodeURIComponent(member.assignmentId)}`)
      if (!result.ok) throw Error('Kunde inte läsa genomförandet.')
      return member.studentIds.map(id => ({ studentId: id, status: result.data.rows.find(row => row.studentId === id)?.status }))
    })).then(groups => {
      if (!active) return
      const pupils = new Map()
      for (const row of groups.flat()) {
        const previous = pupils.get(row.studentId)
        pupils.set(row.studentId, previous && previous.status !== 'submitted' ? previous : row)
      }
      setState({ rows: [...pupils.values()] })
    }).catch(() => { if (active) setState({ error: true }) })
    return () => { active = false }
  }, [scopeKey, revision])
  if (state.loading) return <p className="screening-note" role="status">Hämtar genomförande…</p>
  if (state.error) return <p className="screening-note">Genomförandet kunde inte hämtas. Läs om för att försöka igen.</p>
  const submitted = state.rows.filter(row => row.status === 'submitted').length
  const unavailable = state.rows.filter(row => !row.status).length
  return <details className="screening-completion">
    <summary>{submitted} av {state.rows.length} inlämnade{unavailable ? ` · underlag saknas för ${unavailable}` : ''}</summary>
    <ul>{state.rows.map(row => <li key={row.studentId}>{names.get(row.studentId) || 'Elev utan tillgängligt namn'} · {labels[row.status] || 'Underlag saknas'}</li>)}</ul>
  </details>
}
