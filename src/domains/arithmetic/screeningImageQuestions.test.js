import { describe, expect, it } from 'vitest'
import { screeningFigures, screeningFigureSvg, findScreeningFigure } from './screeningFigures.js'
import { geometryTasks, normalizeImageQuestion } from './screeningImageQuestions.js'
import { createDiagnosticGrid, recordDiagnosticGridEvent, replayDiagnosticGrid } from './diagnosticGridModel.js'
import { summarizeDiagnosticObservation } from './diagnosticObservation.js'
import { summarizeDiagnosticScreening } from './diagnosticScreeningSummary.js'
import { prepareDiagnosticAppend } from './diagnosticAttemptAppend.js'
import { recoverDiagnosticDraft } from '../../lib/diagnosticDraftRecovery.js'
import { diagnosticHistoryFrame } from './diagnosticHistory.js'

const task = geometryTasks.find(item => item.responseMode === 'multiple')
const start = (multiple = true) => createDiagnosticGrid({ attemptId: 'image-test', taskId: task.taskId, taskVersion: 1,
  answerType: 'choice', choiceConfig: { optionIds: task.options.map(option => option.id), multiple } })
const select = (grid, after) => recordDiagnosticGridEvent(grid, { type: 'selection_change', before: grid.selectedOptionIds, after }, 1000)
describe('original screening geometry', () => {
  it('has unique versioned drawings and preserves inclusive classification', () => {
    expect(new Set(screeningFigures.map(item => item.id)).size).toBe(screeningFigures.length)
    expect(findScreeningFigure('square-rotated').tags).toEqual(expect.arrayContaining(['rektangel', 'romb', 'parallellogram']))
    for (const figure of screeningFigures) expect(screeningFigureSvg(figure.id)).toMatch(/^<svg/u)
  })
  it('validates every bundled question and rejects unknown images, duplicate options and invalid keys', () => {
    for (const item of geometryTasks) expect(normalizeImageQuestion(item).responseMode).toBe(item.responseMode)
    expect(() => normalizeImageQuestion({ ...task, correctOptionIds: ['missing'] })).toThrow()
    expect(() => normalizeImageQuestion({ ...task, options: [task.options[0], task.options[0]] })).toThrow()
    expect(() => normalizeImageQuestion({ ...task, options: [{ id: 'a', image: { source: 'bank', id: 'unknown', version: 1 } }, task.options[1]] })).toThrow()
  })
  it('marks exact sets, preserving partial and incorrect choices without arithmetic signals', () => {
    const partial = summarizeDiagnosticObservation(task, select(start(), ['square', 'rectangle']))
    expect(partial).toMatchObject({ answerStatus: 'incorrect', correctSelections: ['square'], missedOptions: ['rhombus'], incorrectSelections: ['rectangle'] })
    expect(summarizeDiagnosticScreening(task, select(start(), ['rhombus', 'square']))).toMatchObject({ answerStatus: 'correct', signals: [] })
    expect(summarizeDiagnosticObservation(task, start()).answerStatus).toBe('unanswered')
  })
  it('replays selection, deselection and submission; rejects invented or duplicate IDs and editing frozen answers', () => {
    const first = select(start(), ['square'])
    const cleared = select(first, [])
    const submitted = recordDiagnosticGridEvent(select(cleared, ['square', 'rhombus']), { type: 'submit' }, 1001)
    expect(replayDiagnosticGrid(submitted).selectedOptionIds).toEqual(['square', 'rhombus'])
    expect(diagnosticHistoryFrame(submitted, 1).selectedOptionIds).toEqual(['square'])
    expect(() => select(start(), ['invented'])).toThrow()
    expect(() => select(start(), ['square', 'square'])).toThrow()
    expect(() => select(start(false), ['square', 'rhombus'])).toThrow()
    expect(() => select(submitted, [])).toThrow()
    expect(() => replayDiagnosticGrid({ ...first, selectedOptionIds: [] })).toThrow()
  })
  it('uses the existing append revision and draft conflict protections', () => {
    const initial = start(), first = select(initial, ['square'])
    expect(prepareDiagnosticAppend({ snapshot: initial, serverRevision: 0, expectedRevision: 0, events: first.events }).snapshot).toEqual(first)
    expect(recoverDiagnosticDraft(initial, first)).toMatchObject({ conflict: false, snapshot: first })
    expect(recoverDiagnosticDraft(first, select(initial, ['rhombus']))).toMatchObject({ conflict: true })
    expect(() => recoverDiagnosticDraft(initial, { ...initial, choiceConfig: { ...initial.choiceConfig, multiple: false } })).toThrow()
  })
})
