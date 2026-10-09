import { describe, expect, it } from 'vitest'
import { diagnosticLineCoordinates, lineTouchesPoint } from './diagnosticLineGeometry.js'
import { createDiagnosticGrid, recordDiagnosticGridEvent, replayDiagnosticGrid } from './diagnosticGridModel.js'

describe('grid-border lines and saved workspace', () => {
  it('snaps new lines to grid borders without moving historical originals', () => {
    const line = { axis: 'horizontal', from: { row: 1, column: 2 }, to: { row: 1, column: 5 } }
    expect(diagnosticLineCoordinates(line).y1).toBe(1.88)
    const border = { ...line, placement: 'grid-border' }
    expect(diagnosticLineCoordinates(border)).toEqual({ x1: 2, y1: 2, x2: 6, y2: 2 })
    expect(lineTouchesPoint(border, { row: 2, column: 4 })).toBe(true)
    expect(lineTouchesPoint(border, { row: 2.5, column: 4 })).toBe(false)
    expect(diagnosticLineCoordinates({ ...border, axis: 'vertical', to: { row: 4, column: 2 } }))
      .toEqual({ x1: 3, y1: 1, x2: 3, y2: 5 })
  })

  it('replays text answers and drawing/eraser strokes exactly, without accepting text in numeric answers', () => {
    let grid = createDiagnosticGrid({ attemptId: 'A', taskId: 'T', taskVersion: 1, answerType: 'text' })
    grid = recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: 'Jag växlade en tia.' })
    grid = recordDiagnosticGridEvent(grid, { type: 'drawing_stroke', points: [[0.1, 0.2], [0.3, 0.4]], erasing: false })
    grid = recordDiagnosticGridEvent(grid, { type: 'drawing_stroke', points: [[0.2, 0.3]], erasing: true })
    expect(replayDiagnosticGrid(JSON.parse(JSON.stringify(grid)))).toEqual(grid)
    const numeric = createDiagnosticGrid({ attemptId: 'B', taskId: 'T', taskVersion: 1 })
    expect(() => recordDiagnosticGridEvent(numeric, { type: 'answer_change', before: '', after: 'Text' })).toThrow()
  })
})
