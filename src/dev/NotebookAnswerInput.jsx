import { useLayoutEffect } from 'react'
import { MATH_ANSWER } from '../domains/arithmetic/diagnosticGridModel'

export default function NotebookAnswerInput({ answer, answerType, active, disabled,
  inputRef, onActivate, onChange, onKey }) {
  const isText = answerType === 'text'
  useLayoutEffect(() => {
    const element = inputRef.current
    if (!isText || !element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight + 2}px`
  }, [answer, isText, inputRef])

  const shared = { id: 'diagnostic-answer', ref: inputRef, 'aria-label': 'Mitt svar',
    value: answer, disabled, onFocus: onActivate, onPointerDown: onActivate }
  return <div className="notebook-answer-field" data-active={active}>
    {isText ? <textarea {...shared} placeholder="Skriv ditt svar här" maxLength={2000}
      onChange={event => onChange(event.target.value)} />
      : <input {...shared} placeholder="Använd siffertangenterna" type="text" inputMode="none" readOnly
        onKeyDown={event => {
          if (event.ctrlKey || event.metaKey || event.altKey) return
          if (event.key === 'Backspace' || event.key === 'Delete') {
            event.preventDefault()
            onKey(event.key === 'Delete' ? 'clear' : 'backspace')
          } else if (event.key.length === 1 && MATH_ANSWER.test(event.key)) {
            event.preventDefault()
            onKey(event.key)
          }
        }} />}
  </div>
}
