import { useState } from 'react'
import QuestionText from '../../QuestionText.jsx'
import ScreeningImageQuestion from '../../student/ScreeningImageQuestion.jsx'

export default function ScreeningQuestionPreview({ task, context = { teacher: true } }) {
  const [selected, setSelected] = useState([])
  return <section className="mt-2 rounded border border-slate-300 bg-white p-2" aria-label="Elevförhandsvisning av vald bildfråga">
    <h4 className="font-semibold"><QuestionText>{task.promptSv}</QuestionText></h4>
    <ScreeningImageQuestion task={task} context={context} selected={selected} onChange={setSelected} />
    {task.responseMode === 'text' && <textarea aria-label="Förhandsvisning skrivsvar" placeholder="Elevens svar" />}
  </section>
}
