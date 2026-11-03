import QuestionText from '../../QuestionText'
import { moveQuestion } from '../../../domains/arithmetic/screeningQuestionOrder.js'

const kinds = { bank: 'Frågebanken', written: 'Egen fråga med facit', text: 'Textfråga', image: 'Bildfråga' }
const button = 'rounded border border-slate-400 px-1.5 py-0.5 disabled:opacity-40'

// The order the pupils meet the questions in; the teacher moves them up and down.
export default function ScreeningQuestionOrder({ questions, onOrder, disabled }) {
  if (questions.length < 2) return null
  return <details className="mt-3 text-sm">
    <summary className="cursor-pointer font-semibold">Ändra ordning ({questions.length} frågor)</summary>
    <ol className="mt-2 space-y-1" aria-label="Frågornas ordning">{questions.map((item, index) => <li key={item.key}
      className="flex items-center gap-2 border-b border-slate-200 pb-1" data-order-key={item.key}>
      <span className="w-5 text-right text-slate-600">{index + 1}.</span>
      <span className="min-w-0 flex-1"><QuestionText>{item.task.promptSv}</QuestionText>
        <span className="ml-2 text-xs text-slate-600">{kinds[item.kind]}{item.key === 'pending' ? ' · inte tillagd än' : ''}</span></span>
      <button type="button" className={button} disabled={disabled || index === 0} aria-label={`Flytta fråga ${index + 1} upp`}
        onClick={() => onOrder(moveQuestion(questions, item.key, -1))}>↑</button>
      <button type="button" className={button} disabled={disabled || index === questions.length - 1} aria-label={`Flytta fråga ${index + 1} ner`}
        onClick={() => onOrder(moveQuestion(questions, item.key, 1))}>↓</button>
    </li>)}</ol>
  </details>
}
