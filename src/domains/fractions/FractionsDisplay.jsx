const NUM_KEYPAD = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['0', '/', '⌫']
]

function FractionsDisplay({
  problem,
  feedback,
  inputValue,
  onInputChange,
  onSubmit,
  onNext,
  inputRef,
  suppressSoftKeyboard = false,
  leftPanel = null
}) {
  if (!problem) return null

  const isAnswering = !feedback
  const text = String(problem?.display?.text || '')
  const correctAnswer = String(problem?.answer?.value ?? '')
  const isSimplify = text.startsWith('Förenkla')

  const handleKeypadKey = (key) => {
    if (!isAnswering) return
    onInputChange(applyFractionKeypadInput(inputValue, key))
  }

  const handleRawInput = (e) => {
    onInputChange(normalizeFractionInput(e.target.value))
  }

  return (
    <div className="w-full">
      <div className="grid gap-5 md:gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-start">
        <div className="flex flex-col items-center gap-4">

          {/* Uppgiftsvisning */}
          <div className="w-full max-w-xl rounded-2xl border-2 border-amber-200 bg-amber-50 px-6 py-5 text-center">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-2">
              {isSimplify ? 'Förenkla bråket' : 'Beräkna'}
            </p>
            <p className="text-3xl md:text-4xl font-bold text-amber-900 font-mono">
              {isSimplify ? text.replace('Förenkla: ', '') : text}
            </p>
          </div>

          {/* Input-fält */}
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-gray-500">=</span>
            {isAnswering ? (
              <input
                ref={inputRef}
                type="text"
                inputMode={suppressSoftKeyboard ? 'none' : 'none'}
                value={inputValue}
                onChange={handleRawInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputValue.trim() !== '') onSubmit()
                }}
                placeholder="?"
                className="w-40 md:w-48 h-14 text-3xl text-center bg-gray-100 border-b-4 border-gray-400 focus:border-amber-500 focus:outline-none rounded font-mono"
                autoComplete="off"
              />
            ) : (
              <span className="text-3xl font-bold text-green-600 font-mono">{correctAnswer}</span>
            )}
          </div>

          {feedback && !feedback.correct && (
            <span className="text-xl font-semibold text-red-600 line-through font-mono">
              {String(feedback.studentAnswer)}
            </span>
          )}

          {leftPanel && <div className="w-full mt-2">{leftPanel}</div>}
        </div>

        {/* Tangentbord */}
        <FractionsKeypad
          onKey={handleKeypadKey}
          onPrimaryAction={isAnswering ? onSubmit : onNext}
          canSubmit={isAnswering ? inputValue.trim() !== '' : true}
          actionLabel={isAnswering ? 'Svara' : 'Nästa'}
          actionIsNext={!isAnswering}
        />
      </div>
    </div>
  )
}

function FractionsKeypad({ onKey, onPrimaryAction, canSubmit, actionLabel, actionIsNext }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 md:p-5 select-none">
      <div className="grid grid-cols-3 gap-3">
        {NUM_KEYPAD.flat().map(key => (
          <button
            key={key}
            type="button"
            onClick={() => onKey(key)}
            className={`h-14 md:h-16 rounded-xl text-2xl font-semibold ${
              key === '/'
                ? 'bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-800 font-bold'
                : key === '⌫'
                  ? 'bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-800'
                  : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onPrimaryAction}
        disabled={!canSubmit}
        className={`mt-3 w-full h-24 rounded-xl disabled:bg-gray-300 text-white text-3xl font-bold ${
          actionIsNext
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {actionLabel}
      </button>

      <button
        type="button"
        onClick={() => onKey('clear')}
        className="mt-3 w-full h-12 rounded-xl bg-red-100 hover:bg-red-200 text-base font-semibold text-red-900"
      >
        Rensa
      </button>
    </div>
  )
}

function normalizeFractionInput(raw) {
  // Allow digits, /, and minus for negative fractions
  return String(raw || '').replace(/[^0-9/\-]/g, '').slice(0, 10)
}

function applyFractionKeypadInput(currentValue, key) {
  const current = String(currentValue || '')
  if (key === 'clear') return ''
  if (key === '⌫') return current.slice(0, -1)
  // Only allow one slash
  if (key === '/') {
    if (current.includes('/') || current === '') return current
    return current + '/'
  }
  if (/^\d$/.test(key)) return current + key
  return current
}

export default FractionsDisplay
