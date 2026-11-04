import { describe, expect, it } from 'vitest'
import { createDiagnosticGrid, recordDiagnosticGridEvent, replayDiagnosticGrid } from './diagnosticGridModel.js'
import { prepareDiagnosticAppend } from './diagnosticAttemptAppend.js'
import { divisionLayouts, divisorShifts, remainderTargets } from './divisionLayout.js'
import { shortDivisionTemplate } from './shortDivisionTemplate.js'

const record = (state, action) => recordDiagnosticGridEvent(state, action, 1000)
const write = (state, row, column, after) => record(state, { type: 'write', position: { row, column }, layer: 'main', before: '', after })
const start = () => record(createDiagnosticGrid({ attemptId: 'D1', taskId: 'T', taskVersion: 1 }), { type: 'division_add', position: { row: 3, column: 2 } })

describe("the pupil's own short division (division button)", () => {
  it('starts three columns wide and grows with a longer numerator', () => {
    let state = start()
    expect(divisionLayouts(state)[0]).toMatchObject({ row: 3, first: 2, width: 3, equalsColumn: 5, answerFirst: 6 })
    for (const [i, d] of ['1', '7', '6', '4'].entries()) state = write(state, 3, 2 + i, d)
    expect(divisionLayouts(state)[0]).toMatchObject({ width: 4, equalsColumn: 6 })
  })

  it('keeps its own answer line, replays and is accepted by the server check', () => {
    const base = start()
    const id = base.divisions[0].id
    const state = record(base, { type: 'answer_line_change', divisionId: id, before: '', after: '44' })
    expect(divisionLayouts(state)[0].answerLine).toBe('44')
    expect(state.answerLine ?? '').toBe('')
    expect(replayDiagnosticGrid(state).answerLines).toEqual({ [id]: '44' })
    const fresh = createDiagnosticGrid({ attemptId: 'D1', taskId: 'T', taskVersion: 1 })
    const prepared = prepareDiagnosticAppend({ snapshot: fresh, serverRevision: 0, expectedRevision: 0, events: state.events })
    expect(prepared.snapshot.divisions).toHaveLength(1)
    const removed = record(state, { type: 'division_remove', divisionId: id })
    expect(removed.divisions).toEqual([])
    expect(removed.answerLines).toEqual({})
  })

  it('matches the printed bar and divisor position for the same two-digit numerator', () => {
    let state = start()
    state = write(write(state, 3, 2, '7'), 3, 3, '8')
    state = write(state, 4, 2, '3')
    const own = divisionLayouts(state)[0]
    const printed = divisionLayouts(state, shortDivisionTemplate({ promptSv: '78/3' }))[0]
    expect(own.width).toBe(printed.width)
    expect(own.equalsColumn - own.first).toBe(printed.equalsColumn - printed.first)
    expect(divisorShifts(state, [own]).get('4:2')).toBe(0.5)
    state = record(state, { type: 'erase', position: { row: 3, column: 3 }, layer: 'main', before: '8', after: '' })
    expect(divisionLayouts(state)[0].width).toBe(1)
  })

  it('centres the divisor under the bar', () => {
    let state = write(start(), 4, 2, '4')
    expect([...divisorShifts(state, divisionLayouts(state))]).toEqual([['4:2', 1]])
    state = write(write(start(), 4, 2, '1'), 4, 3, '2')
    expect([...divisorShifts(state, divisionLayouts(state))]).toEqual([['4:2', 0.5], ['4:3', 0.5]])
  })
})

describe('remainder tap areas', () => {
  it('are half cells in the row above the numerator and half a cell past the last digit', () => {
    let state = start()
    for (const [i, d] of ['1', '7', '6'].entries()) state = write(state, 3, 2 + i, d)
    const targets = remainderTargets(state, divisionLayouts(state))
    expect(targets.map(t => `${t.row}:${t.column}:${t.half}->${t.note.column}`)).toEqual([
      '2:2:right->3', '2:3:left->3', '2:3:right->4', '2:4:left->4', '2:4:right->5', '2:5:left->5'])
    expect(targets.every(t => t.note.row === 3)).toBe(true)
  })

  it('never use a cell with a large digit in it, and need a numerator', () => {
    let state = start()
    expect(remainderTargets(state, divisionLayouts(state))).toEqual([])
    for (const [i, d] of ['1', '7'].entries()) state = write(state, 3, 2 + i, d)
    state = write(state, 2, 3, '9')
    expect(remainderTargets(state, divisionLayouts(state)).some(t => t.row === 2 && t.column === 3)).toBe(false)
  })

  it('work the same way for the printed division', () => {
    const template = shortDivisionTemplate({ promptSv: '55//5' })
    const grid = createDiagnosticGrid({ attemptId: 'D2', taskId: 'T', taskVersion: 1 })
    const targets = remainderTargets(grid, divisionLayouts(grid, template))
    expect(targets).toHaveLength(4)
    expect(targets.at(-1).note).toEqual({ row: template.row, column: template.first + 2 })
  })
})
