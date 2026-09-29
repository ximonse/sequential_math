import { useState, useEffect, useRef } from 'react'

const DOT_SIZE = 22
const DICE_PATTERNS = {
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

function Die({ dots, dieRef }) {
  return (
    <div
      ref={dieRef}
      className="relative bg-white shadow-lg"
      style={{
        width: 240,
        height: 240,
        border: '3px solid #374151',
        borderRadius: 4
      }}
      tabIndex={dieRef ? 0 : undefined}
    >
      {dots.map((pos, i) => (
        <div
          key={i}
          className="absolute bg-red-600 rounded-full"
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            left: `${pos[0]}%`,
            top: `${pos[1]}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}
    </div>
  )
}

export default function SubitizingDice({ value, onAnswer, disabled = false }) {
  const [startTime] = useState(Date.now())
  const diceRef = useRef(null)

  useEffect(() => {
    diceRef.current?.focus()
  }, [value])

  const handleNumberClick = (num) => {
    if (disabled) return
    const timeMs = Date.now() - startTime
    onAnswer(num, timeMs)
  }

  return (
    <div className="flex flex-col gap-8 items-center justify-center py-8">
      <div className="flex gap-5 justify-center flex-wrap">
        {value <= 5 ? (
          <Die dots={DICE_PATTERNS[value] || []} dieRef={diceRef} />
        ) : (
          <>
            <Die dots={DICE_PATTERNS[5]} />
            <Die dots={DICE_PATTERNS[value - 5] || []} dieRef={diceRef} />
          </>
        )}
      </div>

      <p className="text-gray-600 text-sm font-medium">Hur många prickar?</p>

      <div className="grid w-full max-w-xl grid-cols-5 gap-3 sm:gap-5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            disabled={disabled}
            className="aspect-square w-full bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-3xl sm:text-5xl leading-none flex items-center justify-center"
          >
            {num}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4">Snabbt som sjutton!</p>
    </div>
  )
}
