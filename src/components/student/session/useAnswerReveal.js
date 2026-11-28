import { useEffect, useState } from 'react'

const CORRECTION_DELAY_MS = 420

export function useAnswerReveal(result) {
  const [revealedResult, setRevealedResult] = useState(null)

  useEffect(() => {
    if (!result || result.correct) return undefined
    const timer = window.setTimeout(() => setRevealedResult(result), CORRECTION_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [result])

  return Boolean(result && (result.correct || revealedResult === result))
}

export function choiceFeedback(id, selected, correctIds, reveal) {
  const correct = correctIds.includes(id)
  if (selected.includes(id)) return correct ? 'correct' : 'incorrect'
  return reveal && correct ? 'correct' : undefined
}
