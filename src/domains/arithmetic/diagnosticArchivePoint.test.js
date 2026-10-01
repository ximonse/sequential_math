import { describe, expect, it } from 'vitest'
import manifest from './diagnosticTasks.v1.json'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from './diagnosticGridModel.js'
import { createDiagnosticArchivePoint } from './diagnosticArchivePoint.js'

const task = manifest.tasks[0]
const record = { attemptId: 'ATTEMPT', studentId: 'PRIVATE-PUPIL', studentName: 'Private Name',
  classIdAtAttempt: 'PRIVATE-CLASS', teacherId: 'PRIVATE-TEACHER', evidenceClass: 'diagnostic_only',
  taskId: task.taskId, taskVersion: task.taskVersion, serverRevision: 2,
  lastSequence: 2, createdAt: 1767139200000, status: 'in_progress' }

describe('diagnostic archive point draft', () => {
  it('keeps only the allowlisted historical facts and no raw working or identity', () => {
    let grid = createDiagnosticGrid({ attemptId: 'ATTEMPT', taskId: task.taskId,
      taskVersion: task.taskVersion })
    grid = recordDiagnosticGridEvent(grid, { type: 'write', position: { row: 0, column: 0 },
      layer: 'main', before: '', after: '8' }, 1000)
    grid = recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: '699' }, 1001)
    const point = createDiagnosticArchivePoint({ record, task, snapshot: grid })
    expect(point).toEqual({ pointVersion: 1, taskId: task.taskId, taskVersion: 1,
      month: '2025-12', submitted: false, answerStatus: 'correct',
      hasWorkHistory: true, finalOccupiedCells: 1, columnAlignment: 'unknown' })
    expect(JSON.stringify(point)).not.toMatch(/PRIVATE|ATTEMPT|events|cells|699|268|431/u)
  })

  it('does not invent time for an older attempt and rejects a mismatched sequence', () => {
    const grid = createDiagnosticGrid({ attemptId: 'ATTEMPT', taskId: task.taskId,
      taskVersion: task.taskVersion })
    expect(createDiagnosticArchivePoint({ record: { ...record, createdAt: undefined, lastSequence: 0 },
      task, snapshot: grid })).toMatchObject({ month: null, answerStatus: 'unanswered' })
    expect(() => createDiagnosticArchivePoint({ record, task, snapshot: grid })).toThrow()
    expect(() => createDiagnosticArchivePoint({ record: { ...record, evidenceClass: 'mastery_eligible',
      lastSequence: 0 }, task, snapshot: grid })).toThrow()
  })
})
