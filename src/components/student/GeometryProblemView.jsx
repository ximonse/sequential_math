import { usePracticeSpeech } from './session/usePracticeSpeech.js'
import PracticeSpeechControls from './session/PracticeSpeechControls.jsx'
import ScreeningImageQuestion from './ScreeningImageQuestion.jsx'
import { QuestionCard } from './practice/PracticeLayout.jsx'
import { choiceFeedback, useAnswerReveal } from './session/useAnswerReveal.js'
import { decodeGeometrySelection, encodeGeometrySelection } from '../../domains/geometry/questions.js'

export default function GeometryProblemView({ problem, geometryCompleted, feedback, inputValue, onInputChange, onSubmit, onNext, studentId, speechMode }) {
  const reveal = useAnswerReveal(feedback)
  const task = problem.choiceTask
  const speech = usePracticeSpeech({ studentId, mode: speechMode, cue: problem.id, text: task.promptSv })
  const selected = decodeGeometrySelection(inputValue)
  const correctLabels = task.options.flatMap((option, index) => task.correctOptionIds.includes(option.id)
    ? [option.labelSv || `Bild ${index + 1}`] : [])
  return <section {...speech.gestureProps} className="rounded-xl border border-gray-200 bg-white p-3 text-gray-800 shadow-sm sm:p-4 [&_.screening-image-question]:text-inherit">
    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-medium text-gray-600">Geometri · nivå {problem.level}</p>
      <PracticeSpeechControls speech={speech} />
    </div>
    <QuestionCard align="left" size="text"><h3 {...speech.readable(task.promptSv, true)}>{task.promptSv}</h3></QuestionCard>
    <ScreeningImageQuestion task={task} selected={selected} disabled={Boolean(feedback)} readable={speech.readable}
      onChange={ids => onInputChange(encodeGeometrySelection(ids))}
      getFeedback={feedback ? id => choiceFeedback(id, selected, task.correctOptionIds, reveal) : undefined} />
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {reveal && <p role="status" className={`text-xl font-semibold ${feedback.correct ? 'text-green-800' : 'text-gray-800'}`}>
        {feedback.correct ? 'Rätt!' : `Rätt svar är ${correctLabels.join(' och ')}.`}
      </p>}
      <button type="button" disabled={feedback ? !reveal : selected.length === 0}
        onClick={feedback ? onNext : onSubmit}
        className="answer-submit-button ml-auto rounded-lg bg-blue-700 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
        {feedback ? 'Nästa fråga' : 'Svara'}
      </button>
    </div>
    <div role="status">
      {geometryCompleted && <p className="mt-3 rounded-lg border border-green-300 bg-green-100 px-3 py-2 text-lg font-semibold text-green-900">
        <span aria-hidden="true">✓ </span>Nivå 2 klarad!
      </p>}
    </div>
  </section>
}
