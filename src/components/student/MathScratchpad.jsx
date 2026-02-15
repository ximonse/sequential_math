import { useEffect, useRef, useState } from 'react'

const CANVAS_RATIO = 1.4 // stående: höjd = bredd * 1.4
const MIN_CANVAS_WIDTH = 320
const MAX_CANVAS_WIDTH = 860
const GRID_STEP_X = 84
const GRID_STEP_Y = 118
const BASE_WIDTH = 740
const BASE_HEIGHT = Math.round(BASE_WIDTH * CANVAS_RATIO)

function MathScratchpad({ visible }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const drawingRef = useRef(false)
  const [isErasing, setIsErasing] = useState(false)
  const [canvasSize, setCanvasSize] = useState({
    width: BASE_WIDTH,
    height: BASE_HEIGHT
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const updateSize = () => {
      const measured = Math.round(container.clientWidth || BASE_WIDTH)
      const width = clamp(measured, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH)
      const height = Math.round(width * CANVAS_RATIO)
      setCanvasSize(prev => (
        prev.width === width && prev.height === height
          ? prev
          : { width, height }
      ))
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawGrid(ctx, canvas.width, canvas.height)
  }, [visible, canvasSize.width, canvasSize.height])

  if (!visible) return null

  const getPoint = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = event.clientX ?? event.touches?.[0]?.clientX
    const clientY = event.clientY ?? event.touches?.[0]?.clientY
    const scaleX = canvas.width / Math.max(1, rect.width)
    const scaleY = canvas.height / Math.max(1, rect.height)
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  const beginStroke = (event) => {
    event.preventDefault()
    const canvas = canvasRef.current
    canvas.setPointerCapture?.(event.pointerId)
    const ctx = canvas.getContext('2d')
    const point = getPoint(event)
    drawingRef.current = true
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
  }

  const drawStroke = (event) => {
    if (!drawingRef.current) return
    event.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const point = getPoint(event)

    ctx.lineWidth = isErasing ? 18 : 2.8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = isErasing ? '#ffffff' : '#1f2937'
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }

  const endStroke = () => {
    drawingRef.current = false
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawGrid(ctx, canvas.width, canvas.height)
  }

  return (
    <div className="mt-6 w-full max-w-2xl rounded-xl bg-white shadow border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">Rityta</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsErasing(false)}
            className={`px-3 py-1 rounded text-xs ${!isErasing ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Penna
          </button>
          <button
            type="button"
            onClick={() => setIsErasing(true)}
            className={`px-3 py-1 rounded text-xs ${isErasing ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Sudd
          </button>
          <button
            type="button"
            onClick={clearCanvas}
            className="px-3 py-1 rounded text-xs bg-gray-800 text-white"
          >
            Rensa
          </button>
        </div>
      </div>
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full rounded border border-gray-300 bg-white touch-none"
          style={{ touchAction: 'none', aspectRatio: `1 / ${CANVAS_RATIO}` }}
          onPointerDown={beginStroke}
          onPointerMove={drawStroke}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
        />
      </div>
    </div>
  )
}

function drawGrid(ctx, width, height) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1

  for (let x = 0; x <= width; x += GRID_STEP_X) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = 0; y <= height; y += GRID_STEP_Y) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export default MathScratchpad
