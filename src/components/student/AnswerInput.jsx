import { useRef, useEffect } from 'react'

function AnswerInput({ value, onChange, onSubmit, disabled }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus()
    }
  }, [disabled])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value.trim() !== '') {
      onSubmit()
    }
  }

  const handleChange = (e) => {
    // Endast siffror och minus
    const val = e.target.value.replace(/[^0-9-]/g, '')
    onChange(val)
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-4">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ditt svar"
        className="w-48 px-4 py-3 text-4xl text-center border-4 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
        autoComplete="off"
      />

      <button
        onClick={onSubmit}
        disabled={disabled || value.trim() === ''}
        className="px-8 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-xl font-semibold rounded-xl transition-colors"
      >
        Svara
      </button>
    </div>
  )
}

export default AnswerInput
