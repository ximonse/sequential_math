const KEYPAD_LAYOUT = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['0', ',', '±']
]

function ProblemDisplay({
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

  const { values, type, result } = problem
  const { a, b } = values
  const isAnswering = !feedback

  const formatNumber = (value) => {
    if (!Number.isFinite(value)) return value
    return Number(value.toFixed(6)).toString().replace('.', ',')
  }

  const operators = {
    addition: '+',
    subtraction: '−',
    multiplication: '×',
    division: '÷'
  }

  const handleInputChange = (raw) => {
    onInputChange(normalizeAnswerInput(raw))
  }

  const handleKeypadKey = (key) => {
    if (!isAnswering) return
    const next = applyKeypadInput(inputValue, key)
    onInputChange(next)
  }

  return (
    <div className="w-full">
      <div className="grid gap-5 md:gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-start">
        <div className="flex flex-col items-center">
          {/* Fråga med input/svar inline */}
          <div className="text-4xl md:text-5xl font-bold text-gray-800 flex items-center justify-center flex-wrap gap-y-2">
            <span>{formatNumber(a)}</span>
            <span className="mx-3 text-blue-600">{operators[type]}</span>
            <span>{formatNumber(b)}</span>
            <span className="mx-3">=</span>

            {/* Input eller svar - fast höjd */}
            <div className="w-36 h-16 flex items-center justify-center">
              {!feedback ? (
                <input
                  ref={inputRef}
                  type="text"
                  inputMode={suppressSoftKeyboard ? 'none' : 'numeric'}
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputValue.trim() !== '') {
                      onSubmit()
                    }
                  }}
                  placeholder="?"
                  className="w-32 h-14 text-4xl md:text-5xl text-center bg-gray-100 border-b-4 border-gray-400 focus:border-blue-500 focus:outline-none rounded"
                  autoComplete="off"
                />
              ) : (
                <span className="text-green-500">{formatNumber(result)}</span>
              )}
            </div>
          </div>

          {/* Fel-info under */}
          <div className="h-8 mt-2">
            {feedback && !feedback.correct && (
              <span className="text-lg text-gray-400 line-through">
                Du svarade: {formatNumber(feedback.studentAnswer)}
              </span>
            )}
          </div>

          {leftPanel && (
            <div className="w-full mt-2">
              {leftPanel}
            </div>
          )}
        </div>

        <AnswerKeypad
          visible
          onKey={handleKeypadKey}
          onPrimaryAction={isAnswering ? onSubmit : onNext}
          canSubmit={isAnswering ? inputValue.trim() !== '' : true}
          actionLabel={isAnswering ? 'Svara' : 'Nasta'}
          actionIsNext={!isAnswering}
        />
      </div>
    </div>
  )
}

function AnswerKeypad({
  visible,
  onKey,
  onPrimaryAction,
  canSubmit,
  actionLabel = 'Svara',
  actionIsNext = false
}) {
  if (!visible) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 md:p-5 select-none">
      <div className="grid grid-cols-3 gap-3">
        {KEYPAD_LAYOUT.flat().map(key => (
          <button
            key={key}
            type="button"
            onClick={() => onKey(key)}
            className="h-16 md:h-[72px] rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-2xl font-semibold text-gray-800"
          >
            {key}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onPrimaryAction}
        disabled={!canSubmit}
        className={`mt-3 w-full h-32 rounded-xl disabled:bg-gray-300 text-white text-3xl font-bold ${
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
          className="h-12 rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-base font-semibold text-amber-900"
        >
          Radera
        </button>
        <button
          type="button"
          onClick={() => onKey('clear')}
          className="h-12 rounded-xl bg-red-100 hover:bg-red-200 active:bg-red-300 text-base font-semibold text-red-900"
        >
          Rensa
        </button>
      </div>
    </div>
  )
}

function normalizeAnswerInput(raw) {
  const input = String(raw || '')
    .replace(/\s+/g, '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, ',')

  const hasNegative = input.startsWith('-')
  let core = hasNegative ? input.slice(1) : input
  core = core.replace(/-/g, '')

  const commaIndex = core.indexOf(',')
  if (commaIndex >= 0) {
    core = `${core.slice(0, commaIndex + 1)}${core.slice(commaIndex + 1).replace(/,/g, '')}`
  }

  return `${hasNegative ? '-' : ''}${core}`
}

function applyKeypadInput(currentValue, key) {
  const current = normalizeAnswerInput(currentValue)

  if (key === 'clear') return ''
  if (key === 'backspace') return current.slice(0, -1)

  if (key === '±') {
    if (current.startsWith('-')) return current.slice(1)
    if (current === '') return '-'
    return `-${current}`
  }

  if (key === ',') {
    if (current.includes(',')) return current
    if (current === '' || current === '-') return `${current}0,`
    return `${current},`
  }

  if (/^\d$/.test(key)) {
    return normalizeAnswerInput(`${current}${key}`)
  }

  return current
}

export default ProblemDisplay
