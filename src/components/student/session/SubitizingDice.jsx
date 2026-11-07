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

  const handleNumberClick = (num, at = Date.now()) => {
    if (disabled) return
    onAnswer(num, at - startTimeRef.current)
  }

  // A computer keyboard or numpad answers too (Simon 2026-11-07). 1-9 answer at once;
  // 10 is "1" then "0", or a lone "0". The time counts from the first key.
  const answerRef = useRef(handleNumberClick)
  useEffect(() => { answerRef.current = handleNumberClick })
  useEffect(() => {
    let pendingOne = null
    const digitOf = event => /^Numpad[0-9]$/u.test(event.code) ? Number(event.code.slice(-1))
      : /^[0-9]$/u.test(event.key) ? Number(event.key) : null
    const onKeyDown = event => {
      const digit = digitOf(event)
      if (digit === null || event.ctrlKey || event.metaKey || event.altKey) return
      event.preventDefault()
      if (pendingOne) {
        // Only "0" completes 10; any other key after "1" just answers 1.
        clearTimeout(pendingOne.timer)
        const { at } = pendingOne
        pendingOne = null
        answerRef.current(digit === 0 ? 10 : 1, at)
        return
      }
      if (digit === 1) {
        const at = Date.now()
        pendingOne = { at, timer: setTimeout(() => { pendingOne = null; answerRef.current(1, at) }, 500) }
        return
      }
      answerRef.current(digit === 0 ? 10 : digit)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (pendingOne) clearTimeout(pendingOne.timer)
    }
  }, [])

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
