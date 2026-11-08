import PracticeLayout, { AnswerBox, PracticeStatus, QuestionCard } from '../../components/student/practice/PracticeLayout'
import PracticeKeypad from '../../components/student/practice/PracticeKeypad'

// Fraction questions in the shared practice frame.
function FractionsDisplay({
  problem,
  feedback,
  inputValue,
  onInputChange,
  onSubmit,
  onNext,
  inputRef,
  workspace = {}
}) {
  if (!problem) return null

  const isAnswering = !feedback
  const text = String(problem?.display?.text || '')
  const correctAnswer = String(problem?.answer?.value ?? '')
  const isSimplify = text.startsWith('Förenkla')

  return <PracticeLayout {...workspace}
    primary={{ isAnswering, onClick: isAnswering ? onSubmit : onNext, disabled: isAnswering && inputValue.trim() === '' }}
    question={<QuestionCard label={isSimplify ? 'Förenkla bråket' : 'Beräkna'}>{isSimplify ? text.replace('Förenkla: ', '') : text}</QuestionCard>}
    answer={<AnswerBox isAnswering={isAnswering} inputRef={inputRef} value={inputValue} onSubmit={onSubmit}
      onChange={raw => onInputChange(normalizeFractionInput(raw))} inputMode="none" result={correctAnswer} />}
    status={<PracticeStatus feedback={feedback} studentAnswer={String(feedback?.studentAnswer ?? '')} />}
    keypad={<PracticeKeypad specials={['/']} isAnswering={isAnswering}
      onKey={key => { if (isAnswering) onInputChange(applyFractionKeypadInput(inputValue, key)) }}
      onPrimaryAction={isAnswering ? onSubmit : onNext} canSubmit={isAnswering ? inputValue.trim() !== '' : true} />} />
}

function normalizeFractionInput(raw) {
  // Allow digits, /, and minus for negative fractions
  return String(raw || '').replace(/[^0-9/-]/g, '').slice(0, 10)
}

function applyFractionKeypadInput(currentValue, key) {
  const current = String(currentValue || '')
  if (key === 'clear') return ''
  if (key === '⌫' || key === 'backspace') return current.slice(0, -1)
  // Only allow one slash
  if (key === '/') {
    if (current.includes('/') || current === '') return current
    return current + '/'
  }
  if (/^\d$/.test(key)) return current + key
  return current
}

export default FractionsDisplay
