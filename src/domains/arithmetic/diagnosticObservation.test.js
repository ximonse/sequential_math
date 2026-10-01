import { describe, expect, it } from 'vitest'
import manifest from './diagnosticTasks.v1.json'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from './diagnosticGridModel.js'
import { summarizeDiagnosticObservation } from './diagnosticObservation.js'

function gridFor(task, actions = []) {
  const initial = createDiagnosticGrid({ attemptId: 'ATTEMPT', taskId: task.taskId,
    taskVersion: task.taskVersion })
  return actions.reduce((grid, action, index) => recordDiagnosticGridEvent(grid, action, index + 1), initial)
}

describe('diagnostic observation facts', () => {
  it('keeps a correct answer distinct from absent working and from submission', () => {
    const task = manifest.tasks[0]
    const grid = gridFor(task, [{ type: 'answer_change', before: '', after: '699' }])
    expect(summarizeDiagnosticObservation(task, grid)).toMatchObject({
      answerStatus: 'correct', submitted: false, explicitAnswer: '699', expectedAnswer: 699,
      finalOccupiedCells: 0, hasWorkHistory: false, answerEventId: 'ATTEMPT:1'
    })
  })

  it('does not turn visible but erased work into a final cell or a method claim', () => {
    const task = manifest.tasks[1]
    const grid = gridFor(task, [
      { type: 'write', position: { row: 0, column: 0 }, layer: 'main', before: '', after: '2' },
      { type: 'erase', position: { row: 0, column: 0 }, layer: 'main', before: '2', after: '' },
      { type: 'answer_change', before: '', after: '575' },
      { type: 'submit' }
    ])
    expect(summarizeDiagnosticObservation(task, grid)).toMatchObject({
      answerStatus: 'correct', submitted: true, expectedAnswer: 575,
      finalOccupiedCells: 0, hasWorkHistory: true
    })
  })

  it('distinguishes unanswered subtraction from an incorrect explicit answer', () => {
    const task = manifest.tasks[3]
    const blank = gridFor(task)
    expect(summarizeDiagnosticObservation(task, blank)).toMatchObject({
      answerStatus: 'unanswered', expectedAnswer: 224, explicitAnswer: null
    })
    const wrong = gridFor(task, [{ type: 'answer_change', before: '', after: '234' }])
    expect(summarizeDiagnosticObservation(task, wrong)).toMatchObject({ answerStatus: 'incorrect' })
    const partial = gridFor(task, [{ type: 'answer_change', before: '', after: '−' }])
    expect(summarizeDiagnosticObservation(task, partial)).toMatchObject({ answerStatus: 'incomplete' })
  })

  it('rejects a mismatched task version or a tampered grid', () => {
    const task = manifest.tasks[0]
    const grid = gridFor(task, [{ type: 'answer_change', before: '', after: '699' }])
    expect(() => summarizeDiagnosticObservation({ ...task, taskVersion: 2 }, grid)).toThrow()
    expect(() => summarizeDiagnosticObservation(task, { ...grid, answer: '698' })).toThrow()
  })
})
