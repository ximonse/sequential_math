import { useEffect, useRef, useState } from 'react'

function MathScratchpad({ visible }) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const [isErasing, setIsErasing] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    drawGrid(ctx, width, height)
  }, [])

  if (!visible) return null

  const getPoint = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = event.clientX ?? event.touches?.[0]?.clientX
    const clientY = event.clientY ?? event.touches?.[0]?.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const beginStroke = (event) => {
    event.preventDefault()
    const canvas = canvasRef.current
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
    <div className="mt-6 w-full max-w-xl rounded-xl bg-white shadow border border-gray-200 p-3">
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
      <canvas
        ref={canvasRef}
        width={740}
        height={280}
        className="w-full rounded border border-gray-300 bg-white touch-none"
        style={{ touchAction: 'none' }}
        onPointerDown={beginStroke}
        onPointerMove={drawStroke}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
      />
    </div>
  )
}

function drawGrid(ctx, width, height) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  const step = 24

  for (let x = 0; x <= width; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = 0; y <= height; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

export default MathScratchpad
