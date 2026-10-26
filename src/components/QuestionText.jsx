import { parseQuestionFractions } from '../lib/questionFractions'
import './questionText.css'

export default function QuestionText({ children }) {
  return parseQuestionFractions(children).map((part, index) => typeof part === 'string' ? part
    : <span key={index} className="question-fraction" role="math" aria-label={`${part.numerator} genom ${part.denominator}`}>
      <span aria-hidden="true" className="question-fraction__numerator">{part.numerator}</span>
      <span aria-hidden="true" className="question-fraction__denominator">{part.denominator}</span>
    </span>)
}
