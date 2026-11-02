import { describe, expect, it } from 'vitest'
import { createDiagnosticGrid, recordDiagnosticGridEvent, replayDiagnosticGrid } from './diagnosticGridModel.js'
import { prepareDiagnosticAppend } from './diagnosticAttemptAppend.js'
import { diagnosticNotebookExport } from './diagnosticNotebookExport.js'
import { analyzeDiagnosticVisibleResult } from './diagnosticVisibleResult.js'
import manifest from './diagnosticTasks.v1.json'
import { isTemplateGap, shortDivisionTemplate, shortDivisionTemplateFor, templateCovers } from './shortDivisionTemplate.js'

const task = { taskId: 'div-short-001', taskVersion: 1, promptSv: 'Räkna ut 78 / 3.' }
const grid = () => createDiagnosticGrid({ attemptId: 'A1', taskId: task.taskId, taskVersion: 1 })
const note = (state, column, after) => recordDiagnosticGridEvent(state,
  { type: 'line_note', position: { row: 1, column }, before: state.lineNotes?.[`1:${column}`] || '', after }, 1000)

describe('short division template', () => {
  it('is derived from the task text for one-digit divisors only', () => {
    expect(shortDivisionTemplate(task)).toMatchObject({ digits: ['7', '8'], divisor: '3', gaps: [{ row: 1, column: 2 }] })
    expect(shortDivisionTemplate({ promptSv: 'Räkna ut 648 / 6.' }).gaps).toHaveLength(2)
    expect(shortDivisionTemplate({ promptSv: 'Räkna ut 360 / 12.' })).toBeNull()
    expect(shortDivisionTemplate({ promptSv: 'Räkna ut 46 · 7.' })).toBeNull()
    expect(shortDivisionTemplate({ promptSv: 'Räkna ut 78 / 3.', gridEnabled: false })).toBeNull()
  })

  it('leaves most of the normal grid free', () => {
    const t = shortDivisionTemplate({ promptSv: 'Räkna ut 936 / 9.' })
    expect(templateCovers(t, 1, 1)).toBe(true)
    expect(templateCovers(t, 3, 1)).toBe(false)
    expect(templateCovers(t, 1, t.lastColumn + 1)).toBe(false)
    expect(t.lastColumn).toBeLessThan(11)
  })

  it('stays away from older attempts that already have work where it would go', () => {
    let state = grid()
    expect(shortDivisionTemplateFor(task, state)).not.toBeNull()
    state = recordDiagnosticGridEvent(state, { type: 'write', position: { row: 1, column: 1 }, layer: 'main', before: '', after: '7' }, 1000)
    expect(shortDivisionTemplateFor(task, state)).toBeNull()
  })

  it('is never part of the pupil cells or lines', () => {
    const state = note(grid(), 2, '1')
    expect(state.cells).toEqual({})
    expect(state.lines).toEqual([])
    expect(isTemplateGap(shortDivisionTemplate(task), { row: 1, column: 2 })).toBe(true)
  })
})

describe('small digits on grid lines', () => {
  it('are saved, replayed and removed through events', () => {
    let state = note(grid(), 2, '1')
    expect(state.lineNotes).toEqual({ '1:2': '1' })
    expect(replayDiagnosticGrid(state).lineNotes).toEqual({ '1:2': '1' })
    state = note(state, 2, '')
    expect(state.lineNotes).toEqual({})
    expect(replayDiagnosticGrid(state).lineNotes).toEqual({})
  })

  it('refuse letters, three digits, the outer edge and a wrong history', () => {
    expect(() => note(grid(), 2, 'x')).toThrow()
    expect(() => note(grid(), 2, '123')).toThrow()
    expect(() => note(grid(), 0, '1')).toThrow()
    expect(() => recordDiagnosticGridEvent(grid(), { type: 'line_note', position: { row: 1, column: 2 }, before: '4', after: '1' }, 1)).toThrow()
  })

  it('reject a snapshot whose notes do not match its events', () => {
    const state = note(grid(), 2, '1')
    expect(() => replayDiagnosticGrid({ ...state, lineNotes: { '1:2': '2' } })).toThrow()
  })

  it('still replay older snapshots without the field', () => {
    const state = recordDiagnosticGridEvent(grid(), { type: 'answer_change', before: '', after: '26' }, 1000)
    const old = { ...state }
    delete old.lineNotes
    expect(replayDiagnosticGrid(old).answer).toBe('26')
  })

  it('are accepted by the server append check', () => {
    const base = grid()
    const event = note(base, 2, '1').events[0]
    const result = prepareDiagnosticAppend({ snapshot: base, serverRevision: 0, expectedRevision: 0, events: [event] })
    expect(result.snapshot.lineNotes).toEqual({ '1:2': '1' })
    expect(() => prepareDiagnosticAppend({ snapshot: base, serverRevision: 0, expectedRevision: 0,
      events: [{ ...event, extra: true }] })).toThrow()
  })

  it('appear in the teacher export with the printed template marked as printed', () => {
    let state = note(grid(), 2, '1')
    state = recordDiagnosticGridEvent(state, { type: 'answer_change', before: '', after: '26' }, 1000)
    const exported = diagnosticNotebookExport(state, task)
    expect(exported.text).toContain('Printed by the app, not written by the pupil: 78')
    expect(exported.text).toContain('small digit 1 on the line between c2 and c3, r2')
    expect(exported.workspace).toMatchObject({ lineNotes: { '1:2': '1' }, answer: '26', template: { divisor: '3' } })
  })
})

describe('teacher detail for multiplication and division bank tasks', () => {
  it('opens instead of failing on the column analysis', () => {
    for (const id of ['div-short-001', 'mul-carry-002']) {
      const bankTask = manifest.tasks.find(t => t.taskId === id)
      const state = createDiagnosticGrid({ attemptId: 'A9', taskId: id, taskVersion: bankTask.taskVersion })
      expect(analyzeDiagnosticVisibleResult(bankTask, state)).toMatchObject({ status: 'unknown' })
    }
  })
})
