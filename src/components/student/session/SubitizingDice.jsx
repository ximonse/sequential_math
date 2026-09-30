import { useEffect, useRef } from 'react'
import { DIE_SIZE } from '../../../lib/talbildLayout'

function Die({ dots, dieRef }) {
  return (
    <div
      ref={dieRef}
      className="relative bg-white shadow-lg"
      style={{
        width: `min(${DIE_SIZE}px, calc((100vw - 100px) / 2))`,
        aspectRatio: '1',
        flex: 'none',
        border: '3px solid #374151',
        borderRadius: 4
      }}
      tabIndex={dieRef ? 0 : undefined}
    >
      {dots.map((dot, i) => (
        <div
          key={i}
          className="absolute bg-red-600 rounded-full"
          style={{
            width: `${(dot.size / DIE_SIZE) * 100}%`,
            height: `${(dot.size / DIE_SIZE) * 100}%`,
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}
    </div>
  )
}

// Remount with a new `key` per problem: the timer starts when the dice appear.
export default function SubitizingDice({ layout, onAnswer, disabled = false }) {
  const startTimeRef = useRef(Date.now())
  const diceRef = useRef(null)

  useEffect(() => {
    diceRef.current?.focus()
  }, [])

  const handleNumberClick = (num) => {
    if (disabled) return
    onAnswer(num, Date.now() - startTimeRef.current)
  }

  return (
    <div className="flex flex-col gap-8 items-center justify-center py-8">
      <div className="flex gap-5 justify-center flex-nowrap">
        {layout.map((dots, index) => (
          <Die key={index} dots={dots} dieRef={index === layout.length - 1 ? diceRef : undefined} />
        ))}
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
