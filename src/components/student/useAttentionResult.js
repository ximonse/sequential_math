import { useEffect, useRef, useState } from 'react'
import { getPilotStudentRuntime } from '../../lib/pilotStudentRuntime'
import { attentionProtocol, ATTENTION_PROTOCOLS } from '../../lib/attentionProtocols'

export default function useAttentionResult(session, studentId, mode) {
  const pass = useRef(null)
  const attempted = useRef(false)
  const progress = useRef({ signature: '', revision: 0, writes: Promise.resolve() })
  const [saveState, setSaveState] = useState({ state: 'idle' })
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const save = async () => {
    if (!pass.current?.result || saveState.state === 'saving') return
    setSaveState({ state: 'saving' })
    try {
      await progress.current.writes.catch(() => {}) // The complete final snapshot supersedes a failed checkpoint.
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
    if (session.hasStarted && session.phase !== 'finished') {
      const signature = `${session.phase}:${session.results.length}:${session.events.length}`
      if (signature !== progress.current.signature) {
        progress.current.signature = signature
        const result = buildResult(true)
        const revision = ++progress.current.revision
        progress.current.writes = progress.current.writes.catch(() => {}).then(() =>
          getPilotStudentRuntime().persistAttentionCheckpoint(studentId, { revision, result }))
        // A failed local checkpoint is surfaced with the final save and retried there.
        progress.current.writes.catch(() => { if (alive.current) setSaveState({ state: 'error' }) })
      }
    }
    if (session.phase !== 'finished' || !session.hasStarted || attempted.current) return
    attempted.current = true
    pass.current.result = buildResult(false)
    void save()
    // The mutable model changes phase only through a render; one pass has one stable result ID.
  })
  function buildResult(unfinished) {
    const protocol = attentionProtocol(mode)
    return { id: pass.current.id, version: 3, mode, startedAt: pass.current.startedAt,
      finishedAt: Date.now(), activeMs: Math.min(120000, session.activeTime()), aborted: unfinished || session.aborted,
      summary: session.summary(), completionReason: unfinished ? 'unfinished' : session.completionReason || (session.aborted ? 'ended' : 'completed'),
      trials: session.trace(), stimuli: session.stimuli(), events: structuredClone(session.events),
      protocolId: Object.keys(ATTENTION_PROTOCOLS).find(id => ATTENTION_PROTOCOLS[id] === protocol), protocol: structuredClone(protocol) }
  }
  return { ...saveState, retry: save, hasResult: session.hasStarted === true }
}
