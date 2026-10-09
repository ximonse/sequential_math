import { useEffect, useRef, useState } from 'react'

const CANVAS_RATIO = 1.4 // stående: höjd = bredd * 1.4
const MIN_CANVAS_WIDTH = 320
const MAX_CANVAS_WIDTH = 860
const GRID_STEP_X = 84
const GRID_STEP_Y = 118
const BASE_WIDTH = 740
const BASE_HEIGHT = Math.round(BASE_WIDTH * CANVAS_RATIO)

function MathScratchpad({ visible, strokes = null, onStroke = null, onClear = null, readOnly = false, wide = false }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const drawingRef = useRef(false)
  const strokeRef = useRef([])
  const [isErasing, setIsErasing] = useState(false)
  const [penColor, setPenColor] = useState('black')
  const [squareGrid, setSquareGrid] = useState(false)
  const [localStrokes, setLocalStrokes] = useState([])
  const drawing = strokes ?? localStrokes
  const saveStroke = stroke => onStroke ? onStroke(stroke) : setLocalStrokes(previous => [...previous, stroke])
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
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const stroke of drawing) {
      ctx.globalCompositeOperation = stroke.erasing ? 'destination-out' : 'source-over'
      ctx.strokeStyle = stroke.color === 'magenta' ? '#b00070' : '#1f2937'
      ctx.lineWidth = stroke.erasing ? 18 : 2.8
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      stroke.points.forEach(([x, y], index) => {
        const px = x * canvas.width, py = y * canvas.height
        if (index === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      if (stroke.points.length === 1) {
        const [x, y] = stroke.points[0]
        ctx.lineTo(x * canvas.width + 0.1, y * canvas.height + 0.1)
      }
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
  }, [visible, canvasSize.width, canvasSize.height, drawing])

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
    if (readOnly) return
    event.preventDefault()
    const canvas = canvasRef.current
    canvas.setPointerCapture?.(event.pointerId)
    const ctx = canvas.getContext('2d')
    const point = getPoint(event)
    drawingRef.current = true
    strokeRef.current = [[clamp(point.x / canvas.width, 0, 1), clamp(point.y / canvas.height, 0, 1)]]
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    drawStroke(event)
  }

  const drawStroke = (event) => {
    if (!drawingRef.current) return
    event.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const point = getPoint(event)
    strokeRef.current.push([clamp(point.x / canvas.width, 0, 1), clamp(point.y / canvas.height, 0, 1)])
    if (strokeRef.current.length === 200) {
      saveStroke({ points: strokeRef.current, erasing: isErasing, color: penColor })
      strokeRef.current = [strokeRef.current.at(-1)]
    }

    ctx.lineWidth = isErasing ? 18 : 2.8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over'
    ctx.strokeStyle = penColor === 'magenta' ? '#b00070' : '#1f2937'
    ctx.lineTo(point.x + 0.1, point.y + 0.1)
    ctx.stroke()
  }

  const endStroke = () => {
    if (drawingRef.current && strokeRef.current.length) saveStroke({ points: strokeRef.current, erasing: isErasing, color: penColor })
    drawingRef.current = false
    strokeRef.current = []
  }

  const clearCanvas = () => {
    if (readOnly) return
    if (!window.confirm('Rensa hela ritytan? Din ritning tas bort, men svaret och räknehäftet påverkas inte.')) return
    if (onClear) onClear()
    else if (!onStroke) setLocalStrokes([])
  }

  return (
    <div className={wide ? 'notebook-scratchpad' : 'mt-6 w-full max-w-2xl rounded-xl bg-white shadow border border-gray-200 p-3'}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">Rityta</p>
        {!readOnly && <div className="flex flex-wrap gap-1" role="group" aria-label="Ritverktyg">
          <button
            type="button"
            onClick={() => { if (!isErasing) setPenColor(previous => previous === 'black' ? 'magenta' : 'black'); setIsErasing(false) }}
            aria-label={`Penna, ${penColor === 'magenta' ? 'magenta' : 'svart'}`}
            aria-pressed={!isErasing}
            className={`px-2 py-1 min-h-11 rounded text-sm border ${!isErasing ? penColor === 'magenta' ? 'bg-fuchsia-700 text-white border-fuchsia-700' : 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-800 border-gray-400'}`}
          >
            Penna
          </button>
          <button
            type="button"
            onClick={() => setIsErasing(true)}
            aria-pressed={isErasing}
            className={`px-2 py-1 min-h-11 rounded text-sm border ${isErasing ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-800 border-gray-400'}`}
          >
            Sudd
          </button>
          <button type="button" aria-label="Kvadratiskt rutmönster" aria-pressed={squareGrid}
            onClick={() => setSquareGrid(previous => !previous)}
            className={`px-2 py-1 min-h-11 rounded text-sm border ${squareGrid ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-800 border-gray-400'}`}>Rutnät</button>
          {(!onStroke || onClear) && <button
            type="button"
            onClick={clearCanvas}
            aria-label="Rensa ritytan"
            className="px-2 py-1 min-h-11 rounded text-sm border border-red-700 bg-white text-red-700"
          >
            Rensa
          </button>}
        </div>}
      </div>
      <div ref={containerRef} className={wide ? 'notebook-drawing-paper' : 'w-full'}>
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full rounded border border-gray-300 touch-none"
          aria-label="Rityta"
          style={{ touchAction: 'none', aspectRatio: `1 / ${CANVAS_RATIO}`, backgroundColor: '#ffffff',
            backgroundImage: 'linear-gradient(to right, #d1d5db 1px, transparent 1px), linear-gradient(to bottom, #d1d5db 1px, transparent 1px)',
            backgroundSize: squareGrid ? '24px 24px' : `${GRID_STEP_X}px ${GRID_STEP_Y}px` }}
          onPointerDown={beginStroke}
          onPointerMove={drawStroke}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
        />
      </div>
    </div>
  )
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export default MathScratchpad
