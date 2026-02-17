import { useCallback, useEffect, useRef, useState } from 'react'

const GRID_COLS = 20
const GRID_ROWS = 14
const CELL_SIZE = 20
const CANVAS_WIDTH = GRID_COLS * CELL_SIZE
const CANVAS_HEIGHT = GRID_ROWS * CELL_SIZE
const BASE_TICK_MS = 170
const MIN_TICK_MS = 95
const MAX_TIME = 120 // 2 minuter

function SnakeGame({ onClose }) {
  const canvasRef = useRef(null)
  const touchStartRef = useRef(null)
  const gameRef = useRef(createInitialGameState())
  const gameOverRef = useRef(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(MAX_TIME)
  const [gameOver, setGameOver] = useState(false)

  useEffect(() => {
    gameOverRef.current = gameOver
  }, [gameOver])

  const setQueuedDirection = useCallback((x, y) => {
    const game = gameRef.current
    if (!game) return
    const current = game.direction
    if (current.x + x === 0 && current.y + y === 0) return
    game.queuedDirection = { x, y }
  }, [])

  // Timer
  useEffect(() => {
    if (gameOver) return undefined
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameOver(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [gameOver])

  // Tangentbord + touch
  useEffect(() => {
    if (gameOver) return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const handleKeyDown = (event) => {
      const key = event.key
      if (key === 'ArrowUp' || key === 'w' || key === 'W') setQueuedDirection(0, -1)
      if (key === 'ArrowDown' || key === 's' || key === 'S') setQueuedDirection(0, 1)
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') setQueuedDirection(-1, 0)
      if (key === 'ArrowRight' || key === 'd' || key === 'D') setQueuedDirection(1, 0)
    }

    const handleTouchStart = (event) => {
      const touch = event.touches?.[0]
      if (!touch) return
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    }

    const handleTouchEnd = (event) => {
      const start = touchStartRef.current
      const touch = event.changedTouches?.[0]
      if (!start || !touch) return

      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      const minSwipe = 18

      if (absX < minSwipe && absY < minSwipe) return
      if (absX > absY) {
        setQueuedDirection(dx > 0 ? 1 : -1, 0)
      } else {
        setQueuedDirection(0, dy > 0 ? 1 : -1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [gameOver, setQueuedDirection])

  // Spelloop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    gameRef.current = createInitialGameState()
    setScore(0)
    setTimeLeft(MAX_TIME)
    setGameOver(false)
    gameOverRef.current = false

    let animationId
    let previous = performance.now()

    const draw = () => {
      const game = gameRef.current

      ctx.fillStyle = '#101826'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      ctx.strokeStyle = 'rgba(90, 120, 170, 0.25)'
      ctx.lineWidth = 1
      for (let x = 0; x <= GRID_COLS; x++) {
        const px = x * CELL_SIZE + 0.5
        ctx.beginPath()
        ctx.moveTo(px, 0)
        ctx.lineTo(px, CANVAS_HEIGHT)
        ctx.stroke()
      }
      for (let y = 0; y <= GRID_ROWS; y++) {
        const py = y * CELL_SIZE + 0.5
        ctx.beginPath()
        ctx.moveTo(0, py)
        ctx.lineTo(CANVAS_WIDTH, py)
        ctx.stroke()
      }

      const foodX = game.food.x * CELL_SIZE + CELL_SIZE / 2
      const foodY = game.food.y * CELL_SIZE + CELL_SIZE / 2
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.arc(foodX, foodY, CELL_SIZE * 0.36, 0, Math.PI * 2)
      ctx.fill()

      game.snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#22c55e' : '#16a34a'
        ctx.fillRect(
          segment.x * CELL_SIZE + 2,
          segment.y * CELL_SIZE + 2,
          CELL_SIZE - 4,
          CELL_SIZE - 4
        )
      })
    }

    const step = () => {
      if (gameOverRef.current) return
      const game = gameRef.current
      const nextDirection = game.queuedDirection || game.direction
      if (nextDirection.x + game.direction.x !== 0 || nextDirection.y + game.direction.y !== 0) {
        game.direction = nextDirection
      }

      const head = game.snake[0]
      const nextHead = {
        x: (head.x + game.direction.x + GRID_COLS) % GRID_COLS,
        y: (head.y + game.direction.y + GRID_ROWS) % GRID_ROWS
      }

      const willGrow = nextHead.x === game.food.x && nextHead.y === game.food.y
      const bodyToCheck = willGrow ? game.snake : game.snake.slice(0, -1)
      const hitSelf = bodyToCheck.some((part) => part.x === nextHead.x && part.y === nextHead.y)
      if (hitSelf) {
        setGameOver(true)
        return
      }

      game.snake.unshift(nextHead)

      if (willGrow) {
        game.score += 1
        setScore(game.score)
        game.tickMs = Math.max(MIN_TICK_MS, game.tickMs - 4)
        game.food = createFoodPosition(game.snake)
      } else {
        game.snake.pop()
      }
    }

    const animate = (timestamp) => {
      if (gameOverRef.current) {
        draw()
        return
      }

      const delta = timestamp - previous
      previous = timestamp

      const game = gameRef.current
      game.elapsedMs += delta
      while (game.elapsedMs >= game.tickMs && !gameOverRef.current) {
        game.elapsedMs -= game.tickMs
        step()
      }

      draw()
      animationId = requestAnimationFrame(animate)
    }

    draw()
    animationId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationId)
  }, [])

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${minutes}:${sec.toString().padStart(2, '0')}`
  }

  const handleClose = () => {
    setGameOver(true)
    onClose()
  }

  return (
    <div className="flex flex-col items-center p-4">
      <div className="flex justify-between items-center w-full max-w-[420px] mb-3">
        <div className="text-xl font-bold text-green-300">Poang: {score}</div>
        <div className="text-xl text-white bg-gray-800 px-3 py-1 rounded-full">{formatTime(timeLeft)}</div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="rounded-xl border-4 border-gray-700 touch-none"
        style={{ touchAction: 'none' }}
      />

      <p className="text-gray-300 text-sm mt-3 text-center">
        Svep eller anvand piltangenter for att styra
      </p>

      {gameOver && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-2xl">
          <div className="bg-white rounded-2xl p-6 text-center mx-4">
            <h2 className="text-2xl font-bold mb-2">Tid ute!</h2>
            <p className="text-lg text-gray-700 mb-1">Du fick {score} poang.</p>
            <p className="text-sm text-gray-500 mb-4">Bra paus, dags for matte igen.</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl"
            >
              Tillbaka till matten
            </button>
          </div>
        </div>
      )}

      {!gameOver && (
        <button
          onClick={handleClose}
          className="mt-4 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
        >
          Avsluta spelet
        </button>
      )}
    </div>
  )
}

function createInitialGameState() {
  const snake = [
    { x: 5, y: 7 },
    { x: 4, y: 7 },
    { x: 3, y: 7 },
    { x: 2, y: 7 }
  ]
  return {
    snake,
    direction: { x: 1, y: 0 },
    queuedDirection: { x: 1, y: 0 },
    food: createFoodPosition(snake),
    score: 0,
    tickMs: BASE_TICK_MS,
    elapsedMs: 0
  }
}

function createFoodPosition(snake) {
  const occupied = new Set(snake.map(part => `${part.x},${part.y}`))
  const freeCells = []
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const key = `${x},${y}`
      if (!occupied.has(key)) freeCells.push({ x, y })
    }
  }

  if (freeCells.length === 0) return { x: 0, y: 0 }
  return freeCells[Math.floor(Math.random() * freeCells.length)]
}

export default SnakeGame
