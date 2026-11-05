import { useCallback, useEffect, useRef, useState } from 'react'
import { getPilotStudentRuntime } from '../../lib/pilotStudentRuntime'

export function useBreakGameResult({ game, studentId, classId, gameOver, timeLeft, score, playerScore = null, computerScore = null }) {
  const [round] = useState(() => ({ id: crypto.randomUUID(), startedAt: Date.now() }))
  const latest = useRef(null)
  const sent = useRef(false)
  const mounted = useRef(false)
  latest.current = { game, studentId, classId, gameOver, timeLeft, score, playerScore, computerScore }

  const report = useCallback((reasonOverride) => {
    if (sent.current || !latest.current.studentId) return
    const current = latest.current
    const reason = reasonOverride || (current.timeLeft === 0 ? 'time_limit' : 'collision')
    const finishedAt = Date.now()
    const result = {
      ...round, version: 1, game: current.game, gameVersion: `${current.game}-90s-v1`,
      finishedAt, durationMs: reason === 'time_limit' ? 90000 : Math.min(90000, Math.max(0, finishedAt - round.startedAt)),
      score: current.score, playerScore: current.playerScore, computerScore: current.computerScore,
      reason, classIdAtAttempt: current.classId
    }
    sent.current = true
    void getPilotStudentRuntime().persistBreakGameResult(current.studentId, result)
      .then(saved => { if (!saved.locallySaved) sent.current = false })
      .catch(() => { sent.current = false })
  }, [round])

  useEffect(() => { if (gameOver) report() }, [gameOver, report])
  useEffect(() => {
    mounted.current = true
    const onPageHide = () => report(latest.current.gameOver ? undefined : 'aborted')
    window.addEventListener('pagehide', onPageHide)
    return () => {
      mounted.current = false
      window.removeEventListener('pagehide', onPageHide)
      // StrictMode's effect replay remounts before this microtask runs.
      queueMicrotask(() => { if (!mounted.current) onPageHide() })
    }
  }, [report])
  return report
}
