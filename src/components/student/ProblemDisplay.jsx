function ProblemDisplay({ problem, feedback, inputValue, onInputChange, onSubmit, inputRef }) {
  if (!problem) return null

  const { values, type, result } = problem
  const { a, b } = values

  const operators = {
    addition: '+',
    subtraction: '−',
    multiplication: '×',
    division: '÷'
  }

  return (
    <div className="flex flex-col items-center">
      {/* Fråga med input/svar inline */}
      <div className="text-5xl font-bold text-gray-800 flex items-center">
        <span>{a}</span>
        <span className="mx-3 text-blue-600">{operators[type]}</span>
        <span>{b}</span>
        <span className="mx-3">=</span>

        {/* Input eller svar - fast höjd */}
        <div className="w-32 h-16 flex items-center justify-center">
          {!feedback ? (
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value.replace(/[^0-9-]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputValue.trim() !== '') {
                  onSubmit()
                }
              }}
              placeholder="?"
              className="w-28 h-14 text-5xl text-center bg-gray-100 border-b-4 border-gray-400 focus:border-blue-500 focus:outline-none rounded"
              autoComplete="off"
            />
          ) : (
            <span className="text-green-500">{result}</span>
          )}
        </div>
      </div>

      {/* Fel-info under */}
      <div className="h-8 mt-2">
        {feedback && !feedback.correct && (
          <span className="text-lg text-gray-400 line-through">
            Du svarade: {feedback.studentAnswer}
          </span>
        )}
      </div>
    </div>
  )
}

export default ProblemDisplay
