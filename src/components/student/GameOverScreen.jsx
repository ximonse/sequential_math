import { useEffect, useState } from 'react'
import { reportHighscore, fetchHighscores } from '../../lib/highscoreClient'

const IMPRESSED_MIN_SNAKE_SCORE = 10

function GameOverScreen({ game, score, timeLeft, onClose, studentId, studentName, classId }) {
  const [highscores, setHighscores] = useState([])
  const [rank, setRank] = useState(null)
  const [loading, setLoading] = useState(true)

  const survived120 = timeLeft === 0
  const isImpressed = game === 'pong'
    ? survived120
    : survived120 && score >= IMPRESSED_MIN_SNAKE_SCORE

  useEffect(() => {
    let cancelled = false
    async function submit() {
      if (!classId) {
        setLoading(false)
        return
      }
      const result = await reportHighscore(game, studentId, studentName, score, classId)
      if (cancelled) return
      setHighscores(result.highscores || [])
      setRank(result.qualified ? result.rank : null)
      setLoading(false)
    }
    submit()
    return () => { cancelled = true }
  }, [game, score, studentId, studentName, classId])

  const isPong = game === 'pong'
  const scoreLabel = isPong ? `${score}s` : `${score} poang`

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-2xl z-10">
      <div className="bg-white rounded-2xl p-6 text-center mx-4 max-w-sm w-full">
        {isImpressed ? (
          <>
            <div className="text-4xl mb-2">🏆</div>
            <h2 className="text-2xl font-bold mb-1 text-yellow-600">Ximon is impressed!</h2>
            <p className="text-gray-600 mb-3">Du klarade hela 2 minuter!</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-1">
              {isPong
                ? (score > 0 ? 'Bra kampat!' : 'Tid ute!')
                : (timeLeft > 0 ? 'Game Over!' : 'Tid ute!')}
            </h2>
            <p className="text-lg text-gray-700 mb-3">{scoreLabel}</p>
          </>
        )}

        {classId && !loading && highscores.length > 0 && (
          <div className="mb-4 text-left">
            <h3 className="text-sm font-semibold text-gray-500 mb-2 text-center">
              {isPong ? 'Highscore — Pong' : 'Highscore — Snake'}
            </h3>
            <ol className="space-y-1">
              {highscores.map((entry, i) => {
                const isMe = entry.studentId === studentId
                return (
                  <li
                    key={entry.studentId}
                    className={`flex justify-between text-sm px-2 py-1 rounded ${
                      isMe ? 'bg-yellow-100 font-bold' : ''
                    }`}
                  >
                    <span>{i + 1}. {entry.name}</span>
                    <span className="text-gray-600">
                      {isPong ? `${entry.score}s` : entry.score}
                    </span>
                  </li>
                )
              })}
            </ol>
            {rank && (
              <p className="text-center text-sm text-yellow-600 font-semibold mt-2">
                Du ar #{rank}!
              </p>
            )}
          </div>
        )}

        {loading && classId && (
          <p className="text-sm text-gray-400 mb-3">Laddar highscore...</p>
        )}

        <button
          onClick={onClose}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl w-full"
        >
          Tillbaka till matten
        </button>
      </div>
    </div>
  )
}

export default GameOverScreen
