/**
 * Displaykomponent för algebrauppgifter.
 * Visar uttrycket tydligt och lägger till x/y/n-knappar i tangentbordet
 * för algebra_simplify-typen.
 */

const NUM_KEYPAD = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['0', '±', '⌫']
]

function AlgebraDisplay({
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

  const isSimplify = problem.skill === 'algebra_simplify' || problem.type === 'algebra_simplify'
  const isAnswering = !feedback
  const expression = String(problem?.values?.expression || '')
  const varDisplay = String(problem?.values?.varDisplay || '')
  const correctAnswer = problem?.answer?.type === 'expression'
    ? String(problem?.answer?.correct || '')
    : String(problem?.result ?? problem?.answer?.correct ?? '')

  const handleKeypadKey = (key) => {
    if (!isAnswering) return
    const next = applyAlgebraKeypadInput(inputValue, key, isSimplify)
    onInputChange(next)
  }

  const handleRawInput = (e) => {
    const raw = e.target.value
    onInputChange(normalizeAlgebraInput(raw, isSimplify))
  }

  return (
    <div className="w-full">
      <div className="grid gap-5 md:gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-start">
        <div className="flex flex-col items-center gap-4">

          {/* Uttrycksvisning */}
          <div className="w-full max-w-xl rounded-2xl border-2 border-purple-200 bg-purple-50 px-6 py-5 text-center">
            {isSimplify ? (
              <>
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-widest mb-2">Förenkla uttrycket</p>
                <p className="text-3xl md:text-4xl font-bold text-purple-900 font-mono">{expression}</p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-widest mb-2">Beräkna värdet</p>
                <p className="text-2xl md:text-3xl font-bold text-purple-900 font-mono mb-3">{expression}</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  {varDisplay.split(',').map(v => (
                    <span key={v} className="inline-block rounded-lg bg-purple-100 border border-purple-300 px-3 py-1 text-base font-semibold text-purple-800 font-mono">
                      {v.trim()}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Input-fält */}
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-gray-500">=</span>
            {isAnswering ? (
              <input
                ref={inputRef}
                type="text"
                inputMode={suppressSoftKeyboard ? 'none' : isSimplify ? 'text' : 'numeric'}
                value={inputValue}
                onChange={handleRawInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputValue.trim() !== '') onSubmit()
                }}
                placeholder="?"
                className="w-40 md:w-48 h-14 text-3xl text-center bg-gray-100 border-b-4 border-gray-400 focus:border-purple-500 focus:outline-none rounded font-mono"
                autoComplete="off"
              />
            ) : (
              <span className="text-3xl font-bold text-green-600 font-mono">{correctAnswer}</span>
            )}
          </div>

          {/* Fel-feedback */}
          {feedback && !feedback.correct && (
            <span className="text-xl font-semibold text-red-600 line-through font-mono">
              Du svarade: {String(feedback.studentAnswer)}
            </span>
          )}

          {leftPanel && <div className="w-full mt-2">{leftPanel}</div>}
        </div>

        {/* Tangentbord */}
        <AlgebraKeypad
          onKey={handleKeypadKey}
          onPrimaryAction={isAnswering ? onSubmit : onNext}
          canSubmit={isAnswering ? inputValue.trim() !== '' : true}
          actionLabel={isAnswering ? 'Svara' : 'Nästa'}
          actionIsNext={!isAnswering}
          showLetters={isSimplify}
        />
      </div>
    </div>
  )
}

function AlgebraKeypad({ onKey, onPrimaryAction, canSubmit, actionLabel, actionIsNext, showLetters }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 md:p-5 select-none">
      {showLetters && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {['x', 'y', 'a', 'b'].map(letter => (
            <button
              key={letter}
              type="button"
              onClick={() => onKey(letter)}
              className="h-12 rounded-xl bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-xl font-bold text-purple-800 font-mono"
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      {showLetters && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {['+', '−', '²'].map(sym => (
            <button
              key={sym}
              type="button"
              onClick={() => onKey(sym)}
              className="h-12 rounded-xl bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-xl font-semibold text-gray-700"
            >
              {sym}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {NUM_KEYPAD.flat().map(key => (
          <button
            key={key}
            type="button"
            onClick={() => onKey(key)}
            className="h-14 md:h-16 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-2xl font-semibold text-gray-800"
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

      <div className="grid grid-cols-2 gap-3 mt-3">
        <button
          type="button"
          onClick={() => onKey('backspace')}
          className="h-12 rounded-xl bg-amber-100 hover:bg-amber-200 text-base font-semibold text-amber-900"
        >
          Radera
        </button>
        <button
          type="button"
          onClick={() => onKey('clear')}
          className="h-12 rounded-xl bg-red-100 hover:bg-red-200 text-base font-semibold text-red-900"
        >
          Rensa
        </button>
      </div>
    </div>
  )
}

function normalizeAlgebraInput(raw, isSimplify) {
  const s = String(raw || '')
  if (isSimplify) {
    // Tillåt: siffror, x, y, n, +, -, mellanslag, ²
    return s.replace(/[^0-9xynabc+\-\s²]/gi, '')
  }
  // Numerisk: bara siffror och minus
  return s.replace(/[^0-9-]/g, '')
}

function applyAlgebraKeypadInput(currentValue, key, isSimplify) {
  const current = String(currentValue || '')
  if (key === 'clear') return ''
  if (key === '⌫' || key === 'backspace') return current.slice(0, -1)

  if (key === '±') {
    if (!isSimplify) {
      if (current.startsWith('-')) return current.slice(1)
      if (current === '') return '-'
      return `-${current}`
    }
    return current
  }

  if (key === '−') return current + '-'
  if (key === '²') return current + '²'

  // Bokstäver och symboler
  if (/^[xynabc+²]$/i.test(key)) return current + key

  // Siffror
  if (/^\d$/.test(key)) return current + key

  return current
}

export default AlgebraDisplay
