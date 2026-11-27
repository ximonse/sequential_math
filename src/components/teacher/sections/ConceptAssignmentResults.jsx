import { findScreeningFigure } from '../../../domains/arithmetic/screeningFigures.js'
import { getConceptDeck, latestConceptRun } from '../../../lib/conceptPractice.js'

function describeFirstError(deck, run) {
  const exercise = deck.exercises.find(item => run.answers[item.id]?.correct === false)
  if (!exercise) return ''
  const response = run.answers[exercise.id].response
  if (exercise.task) {
    const label = id => {
      const choice = exercise.task.options.find(option => option.id === id)
      return choice?.labelSv || findScreeningFigure(choice?.image?.id, choice?.image?.version)?.nameSv || id
    }
    return `${exercise.prompt} Valde ${response.map(label).join(', ')}. Facit ${exercise.task.correctOptionIds.map(label).join(', ')}.`
  }
  const first = exercise.objects.find(object => response[object.id] !== object.field)
  const title = id => deck.cards.find(card => card.id === id)?.title
  return `${first.text} placerades under ${title(response[first.id])}. Facit ${title(first.field)}.`
}

export default function ConceptAssignmentResults({ assignment, students, classIds }) {
  const deck = getConceptDeck(assignment.conceptDeckId)
  if (!deck) return null
  const activity = students.flatMap(student => {
    const groupSelected = student.groupIds?.some(id => classIds.includes(id))
    const run = latestConceptRun(student, deck, assignment.id, groupSelected ? [] : classIds)
    return run ? [{ student, run }] : []
  })
  return <details className="mt-1 text-sm">
    <summary className="cursor-pointer font-semibold text-blue-800">Begreppskort och övningssvar ({activity.length})</summary>
    {activity.length === 0 ? <p className="py-2 text-gray-600">Ingen registrerad aktivitet för uppdraget i valt elevurval.</p> :
    <div className="overflow-x-auto">
      <table className="mt-2 w-full text-left">
        <caption className="mb-1 text-left text-xs text-gray-600">Senast påbörjade omgången per elev</caption>
        <thead><tr><th scope="col" className="pr-3">Elev</th><th scope="col" className="pr-3">Begreppskort</th><th scope="col">Övning</th></tr></thead>
        <tbody>{activity.map(({ student, run }) => {
          const cards = Object.values(run.cards)
          const answers = Object.values(run.answers)
          const firstError = describeFirstError(deck, run)
          return <tr key={student.studentId} className="border-t border-gray-200">
            <th scope="row" className="py-1 pr-3 font-medium">{student.name}</th>
            <td className="py-1 pr-3">{run.cardsOpenedAt
              ? `${cards.length} av ${deck.cards.length} kort vända · ${new Date(Math.max(run.cardsOpenedAt, ...cards)).toLocaleDateString('sv-SE')}`
              : 'Kortleken ej öppnad'}</td>
            <td className="py-1">{answers.length ? `${answers.filter(answer => answer.correct).length} av ${answers.length} rätt · ${answers.length} av ${deck.exercises.length} besvarade` : 'Inga övningssvar'}
              {firstError && <p className="mt-0.5 text-xs text-gray-600">{firstError}</p>}</td>
          </tr>
        })}</tbody>
      </table>
    </div>}
  </details>
}
