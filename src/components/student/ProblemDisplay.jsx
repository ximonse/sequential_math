import PracticeLayout, { AnswerBox, PracticeStatus, QuestionCard } from './practice/PracticeLayout'
import PracticeKeypad from './practice/PracticeKeypad'

const OPERATORS = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' }

function formatNumber(value) {
  if (!Number.isFinite(value)) return value
  return Number(value.toFixed(6)).toString().replace('.', ',')
}

function ProblemDisplay({
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

  const { values = {}, type, result } = problem
  const { a, b } = values
  const isAnswering = !feedback
  const promptText = String(problem?.metadata?.promptText || '').trim()
  const isFluencyPrompt = problem?.skill === 'number_bonds' || problem?.skill === 'doubles'

  const question = promptText
    ? <QuestionCard align={isFluencyPrompt ? 'center' : 'left'} size={isFluencyPrompt ? 'prompt' : 'text'} preWrap>{promptText}</QuestionCard>
    : <QuestionCard>
      {formatNumber(a)}<span className="mx-2 text-blue-600">{OPERATORS[type]}</span>{formatNumber(b)}
    </QuestionCard>

  return <PracticeLayout {...workspace}
    primary={{ isAnswering, onClick: isAnswering ? onSubmit : onNext, disabled: isAnswering && inputValue.trim() === '' }}
    question={question}
    answer={<AnswerBox isAnswering={isAnswering} inputRef={inputRef} value={inputValue} onSubmit={onSubmit}
      onChange={raw => onInputChange(normalizeAnswerInput(raw))}
      inputMode={suppressSoftKeyboard ? 'none' : 'numeric'} result={formatNumber(result)} />}
    status={<PracticeStatus feedback={feedback} studentAnswer={formatNumber(feedback?.studentAnswer)} />}
    keypad={<PracticeKeypad specials={[',', '±']} isAnswering={isAnswering}
      onKey={key => { if (isAnswering) onInputChange(applyKeypadInput(inputValue, key)) }}
      onPrimaryAction={isAnswering ? onSubmit : onNext} canSubmit={isAnswering ? inputValue.trim() !== '' : true} />} />
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
