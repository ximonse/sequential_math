import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function PauseGameHighscorePanel({ selectedClassIds }) {
  const [pongScores, setPongScores] = useState([])
  const [snakeScores, setSnakeScores] = useState([])
  const [loading, setLoading] = useState(false)

  const classId = selectedClassIds?.length === 1 ? selectedClassIds[0] : null

  useEffect(() => {
    if (!classId) {
      setPongScores([])
      setSnakeScores([])
      return
    }
    let cancelled = false
    setLoading(true)

    Promise.all([
      fetch(`${API_BASE}/api/highscores?game=pong&classId=${encodeURIComponent(classId)}`)
        .then(r => r.ok ? r.json() : { highscores: [] }).catch(() => ({ highscores: [] })),
      fetch(`${API_BASE}/api/highscores?game=snake&classId=${encodeURIComponent(classId)}`)
        .then(r => r.ok ? r.json() : { highscores: [] }).catch(() => ({ highscores: [] }))
    ]).then(([pong, snake]) => {
      if (cancelled) return
      setPongScores(pong.highscores || [])
      setSnakeScores(snake.highscores || [])
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [classId])

  if (!classId) {
    return <p className="text-sm text-gray-500">Valj en enskild klass for att se highscore.</p>
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Laddar highscore...</p>
  }

  const renderList = (scores, unit) => {
    if (scores.length === 0) return <p className="text-gray-400 text-sm">Inga resultat annu</p>
    return (
      <ol className="space-y-1">
        {scores.map((entry, i) => (
          <li key={entry.studentId} className="flex justify-between text-sm">
            <span>{i + 1}. {entry.name}</span>
            <span className="text-gray-500">{entry.score}{unit}</span>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="font-semibold text-sm mb-2">Pong (tid)</h4>
        {renderList(pongScores, 's')}
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-2">Snake (poang)</h4>
        {renderList(snakeScores, '')}
      </div>
    </div>
  )
}
