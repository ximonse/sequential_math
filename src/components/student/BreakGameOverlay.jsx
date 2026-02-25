import PongGame from './PongGame'
import SnakeGame from './SnakeGame'

function BreakGameOverlay({ activeBreakGame, onClose }) {
  if (!activeBreakGame) return null

  const isPong = activeBreakGame === 'pong'
  return (
    <div className={`min-h-screen flex items-center justify-center relative ${
      isPong
        ? 'bg-gradient-to-br from-indigo-900 to-purple-900'
        : 'bg-gradient-to-br from-emerald-900 to-cyan-900'
    }`}
    >
      {isPong ? (
        <PongGame onClose={() => onClose('pong')} />
      ) : (
        <SnakeGame onClose={() => onClose('snake')} />
      )}
    </div>
  )
}

export default BreakGameOverlay
