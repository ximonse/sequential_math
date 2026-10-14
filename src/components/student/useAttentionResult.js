import { useEffect, useRef, useState } from 'react'
import { getPilotStudentRuntime } from '../../lib/pilotStudentRuntime'

export default function useAttentionResult(session, studentId, mode) {
  const pass = useRef(null)
  const attempted = useRef(false)
  const [saveState, setSaveState] = useState({ state: 'idle' })
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const save = async () => {
    if (!pass.current?.result || saveState.state === 'saving') return
    setSaveState({ state: 'saving' })
    try {
      const result = await getPilotStudentRuntime().persistAttentionResult(studentId, pass.current.result, {
        onLocalSaved: () => { if (alive.current) setSaveState({ state: 'pending' }) }
      })
      if (alive.current) setSaveState({ state: result.ok ? 'saved' : result.locallySaved && !result.rejected ? 'pending' : 'error' })
    } catch {
      if (alive.current) setSaveState({ state: 'error' })
    }
  }
  useEffect(() => {
    if (session.hasStarted && !pass.current) pass.current = { id: crypto.randomUUID(), startedAt: Date.now() }
    if (session.phase !== 'finished' || !session.hasStarted || attempted.current) return
    attempted.current = true
    pass.current.result = { id: pass.current.id, version: 1, mode, startedAt: pass.current.startedAt,
      finishedAt: Date.now(), activeMs: session.elapsed, aborted: session.aborted, summary: session.summary() }
    void save()
    // The mutable model changes phase only through a render; one pass has one stable result ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase, session.hasStarted, studentId, mode])
  return { ...saveState, retry: save, hasResult: session.hasStarted === true }
}
