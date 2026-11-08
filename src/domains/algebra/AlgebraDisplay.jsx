import PracticeLayout, { AnswerBox, PracticeStatus, QuestionCard } from '../../components/student/practice/PracticeLayout'
import PracticeKeypad from '../../components/student/practice/PracticeKeypad'

// Algebra questions in the shared practice frame; simplifying adds letter keys.
function AlgebraDisplay({
  problem,
  feedback,
  inputValue,
  onInputChange,
  onSubmit,
  onNext,
  inputRef,
  suppressSoftKeyboard = false,
  workspace = {}
}) {
  if (!problem) return null

  const isSimplify = problem.skill === 'algebra_simplify' || problem.type === 'algebra_simplify'
  const isAnswering = !feedback
  const expression = String(problem?.values?.expression || '')
  const varDisplay = String(problem?.values?.varDisplay || '')
  const correctAnswer = problem?.answer?.type === 'expression'
    ? String(problem?.answer?.correct || '')
    : String(problem?.result ?? problem?.answer?.correct ?? '')

  const question = <QuestionCard label={isSimplify ? 'Förenkla uttrycket' : 'Beräkna värdet'}>
    {expression}
    {!isSimplify && varDisplay && <span className="mt-2 flex flex-wrap justify-center gap-2 text-base font-semibold">
      {varDisplay.split(',').map(value => <span key={value} className="rounded-lg border border-blue-200 bg-white px-3 py-0.5 text-gray-800">{value.trim()}</span>)}
    </span>}
  </QuestionCard>

  return <PracticeLayout {...workspace}
    primary={{ isAnswering, onClick: isAnswering ? onSubmit : onNext, disabled: isAnswering && inputValue.trim() === '' }}
    question={question}
    answer={<AnswerBox isAnswering={isAnswering} inputRef={inputRef} value={inputValue} onSubmit={onSubmit}
      onChange={raw => onInputChange(normalizeAlgebraInput(raw, isSimplify))}
      inputMode={suppressSoftKeyboard ? 'none' : isSimplify ? 'text' : 'numeric'} result={correctAnswer} />}
    status={<PracticeStatus feedback={feedback} studentAnswer={String(feedback?.studentAnswer ?? '')} />}
    keypad={<PracticeKeypad specials={['±']} extraKeys={isSimplify ? ['x', 'y', 'a', 'b', '+', '−', '²'] : []} isAnswering={isAnswering}
      onKey={key => { if (isAnswering) onInputChange(applyAlgebraKeypadInput(inputValue, key)) }}
      onPrimaryAction={isAnswering ? onSubmit : onNext} canSubmit={isAnswering ? inputValue.trim() !== '' : true} />} />
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

function applyAlgebraKeypadInput(currentValue, key) {
  const current = String(currentValue || '')
  if (key === 'clear') return ''
  if (key === '⌫' || key === 'backspace') return current.slice(0, -1)

  if (key === '±') {
    if (current.startsWith('-')) return current.slice(1)
    if (current === '') return '-'
    return `-${current}`
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
