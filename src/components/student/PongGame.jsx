import { useRef, useEffect, useState, useCallback } from 'react'

const PADDLE_HEIGHT = 80
const PADDLE_WIDTH = 12
const BALL_SIZE = 14
const PADDLE_SPEED = 8
const INITIAL_BALL_SPEED = 4
const MAX_TIME = 180 // 3 minuter

function PongGame({ onClose }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const [score, setScore] = useState({ player: 0, computer: 0 })
  const [timeLeft, setTimeLeft] = useState(MAX_TIME)
  const [gameOver, setGameOver] = useState(false)
  const touchYRef = useRef(null)

  const initGame = useCallback(() => ({
    player: { y: 160 },
    computer: { y: 160 },
    ball: {
      x: 200,
      y: 150,
      dx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      dy: INITIAL_BALL_SPEED * (Math.random() - 0.5)
    },
    keys: { up: false, down: false }
  }), [])

  // Timer
  useEffect(() => {
    if (gameOver) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameOver(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameOver])

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const game = initGame()
    gameRef.current = game

    // Keyboard handlers (för desktop)
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') game.keys.up = true
      if (e.key === 'ArrowDown' || e.key === 's') game.keys.down = true
    }

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') game.keys.up = false
      if (e.key === 'ArrowDown' || e.key === 's') game.keys.down = false
    }

    // Touch handlers (för iPad)
    const handleTouchMove = (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      const rect = canvas.getBoundingClientRect()
      const y = touch.clientY - rect.top
      touchYRef.current = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, y - PADDLE_HEIGHT / 2))
    }

    const handleTouchEnd = () => {
      touchYRef.current = null
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd)

    let animationId

    const update = () => {
      if (gameOver) return

      // Flytta spelarens paddle - touch eller tangentbord
      if (touchYRef.current !== null) {
        // Touch: gå direkt till touch-position
        const targetY = touchYRef.current
        const diff = targetY - game.player.y
        game.player.y += diff * 0.3 // Smooth movement
      } else {
        // Tangentbord
        if (game.keys.up) game.player.y = Math.max(0, game.player.y - PADDLE_SPEED)
        if (game.keys.down) game.player.y = Math.min(canvas.height - PADDLE_HEIGHT, game.player.y + PADDLE_SPEED)
      }

      // Enkel AI för datorn
      const computerCenter = game.computer.y + PADDLE_HEIGHT / 2
      const ballCenter = game.ball.y
      if (computerCenter < ballCenter - 25) {
        game.computer.y = Math.min(canvas.height - PADDLE_HEIGHT, game.computer.y + PADDLE_SPEED * 0.5)
      } else if (computerCenter > ballCenter + 25) {
        game.computer.y = Math.max(0, game.computer.y - PADDLE_SPEED * 0.5)
      }

      // Flytta bollen
      game.ball.x += game.ball.dx
      game.ball.y += game.ball.dy

      // Studsa mot tak/golv
      if (game.ball.y <= 0 || game.ball.y >= canvas.height - BALL_SIZE) {
        game.ball.dy *= -1
        game.ball.y = Math.max(0, Math.min(canvas.height - BALL_SIZE, game.ball.y))
      }

      // Kollision med spelarens paddle (vänster)
      if (
        game.ball.x <= PADDLE_WIDTH + 15 &&
        game.ball.x >= 15 &&
        game.ball.y + BALL_SIZE >= game.player.y &&
        game.ball.y <= game.player.y + PADDLE_HEIGHT &&
        game.ball.dx < 0
      ) {
        game.ball.dx = Math.abs(game.ball.dx) * 1.03
        game.ball.dy += (Math.random() - 0.5) * 2
      }

      // Kollision med datorns paddle (höger)
      if (
        game.ball.x >= canvas.width - PADDLE_WIDTH - 15 - BALL_SIZE &&
        game.ball.x <= canvas.width - 15 &&
        game.ball.y + BALL_SIZE >= game.computer.y &&
        game.ball.y <= game.computer.y + PADDLE_HEIGHT &&
        game.ball.dx > 0
      ) {
        game.ball.dx = -Math.abs(game.ball.dx) * 1.03
        game.ball.dy += (Math.random() - 0.5) * 2
      }

      // Poäng
      if (game.ball.x < 0) {
        setScore(s => ({ ...s, computer: s.computer + 1 }))
        game.ball = { x: 200, y: 150, dx: INITIAL_BALL_SPEED, dy: INITIAL_BALL_SPEED * (Math.random() - 0.5) }
      }
      if (game.ball.x > canvas.width) {
        setScore(s => ({ ...s, player: s.player + 1 }))
        game.ball = { x: 200, y: 150, dx: -INITIAL_BALL_SPEED, dy: INITIAL_BALL_SPEED * (Math.random() - 0.5) }
      }

      // Begränsa boll-hastighet
      game.ball.dx = Math.max(-10, Math.min(10, game.ball.dx))
      game.ball.dy = Math.max(-8, Math.min(8, game.ball.dy))

      // Rita
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Mittlinje
      ctx.setLineDash([8, 8])
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(canvas.width / 2, 0)
      ctx.lineTo(canvas.width / 2, canvas.height)
      ctx.stroke()
      ctx.setLineDash([])

      // Paddles
      ctx.fillStyle = '#4ade80'
      ctx.fillRect(15, game.player.y, PADDLE_WIDTH, PADDLE_HEIGHT)

      ctx.fillStyle = '#f87171'
      ctx.fillRect(canvas.width - 15 - PADDLE_WIDTH, game.computer.y, PADDLE_WIDTH, PADDLE_HEIGHT)

      // Boll
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(game.ball.x + BALL_SIZE / 2, game.ball.y + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2)
      ctx.fill()

      animationId = requestAnimationFrame(update)
    }

    update()

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
      cancelAnimationFrame(animationId)
    }
  }, [initGame, gameOver])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleClosePong = () => {
    setGameOver(true)
    onClose()
  }

  return (
    <div className="flex flex-col items-center p-4">
      {/* Header */}
      <div className="flex justify-between items-center w-full max-w-[400px] mb-3">
        <div className="text-3xl font-bold text-green-400">{score.player}</div>
        <div className="text-xl text-white bg-gray-800 px-3 py-1 rounded-full">{formatTime(timeLeft)}</div>
        <div className="text-3xl font-bold text-red-400">{score.computer}</div>
      </div>

      {/* Canvas - anpassad för iPad */}
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        className="rounded-xl border-4 border-gray-700 touch-none"
        style={{ touchAction: 'none' }}
      />

      {/* Instruktioner */}
      <p className="text-gray-300 text-sm mt-3">
        Dra fingret upp/ner för att styra 🏓
      </p>

      {/* Game over overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-2xl">
          <div className="bg-white rounded-2xl p-6 text-center mx-4">
            <h2 className="text-2xl font-bold mb-2">
              {score.player > score.computer ? '🎉 Du vann!' : score.player < score.computer ? '😅 Datorn vann' : '🤝 Oavgjort!'}
            </h2>
            <p className="text-xl text-gray-600 mb-4">
              {score.player} - {score.computer}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl"
            >
              Tillbaka till matten
            </button>
          </div>
        </div>
      )}

      {/* Stäng-knapp */}
      {!gameOver && (
        <button
          onClick={handleClosePong}
          className="mt-4 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
        >
          Avsluta spelet
        </button>
      )}
    </div>
  )
}

export default PongGame
