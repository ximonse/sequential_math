import { useState, useEffect, useRef } from 'react'

export default function SubitizingDice({ value, onAnswer, disabled = false }) {
  const [startTime] = useState(Date.now())
  const diceRef = useRef(null)

  useEffect(() => {
    diceRef.current?.focus()
  }, [value])

  const getDicePattern = (num) => {
    const patterns = {
      0: [],
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[50, 50], [25, 25], [75, 75]],
      4: [[25, 25], [75, 25], [25, 75], [75, 75]],
      5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
      6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
      7: [[25, 25], [75, 25], [25, 50], [50, 50], [75, 50], [25, 75], [75, 75]],
      8: [[25, 25], [50, 25], [75, 25], [25, 50], [75, 50], [25, 75], [50, 75], [75, 75]],
      9: [[25, 25], [50, 25], [75, 25], [25, 50], [50, 50], [75, 50], [25, 75], [50, 75], [75, 75]],
      10: [[20, 20], [50, 20], [80, 20], [20, 50], [50, 50], [80, 50], [20, 80], [50, 80], [80, 80], [50, 92]]
    }
    return patterns[num] || []
  }

  const handleNumberClick = (num) => {
    if (disabled) return
    const timeMs = Date.now() - startTime
    onAnswer(num, timeMs)
  }

  const dots = getDicePattern(value)
  const dotSize = 12

  const renderDice = () => {
    if (value <= 5) {
      return (
        <div
          ref={diceRef}
          className="relative bg-white rounded-lg shadow-lg p-8"
          style={{
            width: 240,
            height: 240,
            border: '2px solid #e5e7eb'
          }}
          tabIndex={0}
        >
          {dots.map((pos, i) => (
            <div
              key={i}
              className="absolute bg-red-600 rounded-full"
              style={{
                width: dotSize,
                height: dotSize,
                left: `${pos[0]}%`,
                top: `${pos[1]}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
        </div>
      )
    } else {
      const firstDots = getDicePattern(5)
      const secondDots = getDicePattern(value - 5)
      return (
        <div className="flex gap-5 justify-center flex-wrap">
          <div
            className="relative bg-white rounded-lg shadow-lg p-8"
            style={{
              width: 240,
              height: 240,
              border: '2px solid #e5e7eb'
            }}
          >
            {firstDots.map((pos, i) => (
              <div
                key={i}
                className="absolute bg-red-600 rounded-full"
                style={{
                  width: dotSize,
                  height: dotSize,
                  left: `${pos[0]}%`,
                  top: `${pos[1]}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            ))}
          </div>
          <div
            ref={diceRef}
            className="relative bg-white rounded-lg shadow-lg p-8"
            style={{
              width: 240,
              height: 240,
              border: '2px solid #e5e7eb'
            }}
            tabIndex={0}
          >
            {secondDots.map((pos, i) => (
              <div
                key={i}
                className="absolute bg-red-600 rounded-full"
                style={{
                  width: dotSize,
                  height: dotSize,
                  left: `${pos[0]}%`,
                  top: `${pos[1]}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            ))}
          </div>
        </div>
      )
    }
  }

  return (
    <div className="flex flex-col gap-8 items-center justify-center py-8">
      {renderDice()}

      <p className="text-gray-600 text-sm font-medium">Hur många prickar?</p>

      <div className="grid grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            disabled={disabled}
            className="w-12 h-12 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {num}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4">Snabbt som sjutton!</p>
    </div>
  )
}
